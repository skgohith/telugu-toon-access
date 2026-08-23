-- Normalise existing values and block duplicate payment references
CREATE UNIQUE INDEX IF NOT EXISTS orders_utr_unique
  ON public.orders (upper(btrim(utr)))
  WHERE utr IS NOT NULL AND btrim(utr) <> '';

CREATE OR REPLACE FUNCTION public.is_valid_utr(p_utr text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_utr IS NOT NULL
     AND btrim(p_utr) ~ '^[A-Za-z0-9-]{6,40}$'
     AND btrim(p_utr) ~ '[0-9]'
     AND length(regexp_replace(btrim(p_utr), '[^A-Za-z0-9]', '', 'g')) >= 6;
$$;

CREATE OR REPLACE FUNCTION public.guest_create_paid_order(p_plan_id uuid, p_coupon_code text, p_name text, p_email text, p_phone text, p_utr text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.plans;
  v_coupon public.coupons;
  v_discount numeric := 0;
  v_coupon_id uuid;
  v_coupon_code text;
  v_order public.orders;
  v_utr text;
  v_existing public.orders;
BEGIN
  IF btrim(coalesce(p_name, '')) = '' OR length(btrim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Enter your full name';
  END IF;
  IF p_email IS NULL OR position('@' in p_email) < 2 THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF btrim(coalesce(p_phone, '')) !~ '^[0-9+ -]{8,15}$' THEN
    RAISE EXCEPTION 'Enter a valid mobile number';
  END IF;
  IF NOT public.is_valid_utr(p_utr) THEN
    RAISE EXCEPTION 'Enter a valid UTR: 6-40 letters/numbers including at least one digit';
  END IF;

  v_utr := upper(btrim(p_utr));

  SELECT * INTO v_existing FROM public.orders WHERE upper(btrim(utr)) = v_utr LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    IF lower(v_existing.customer_email) = lower(btrim(p_email)) THEN
      RETURN public.order_public_json(v_existing);
    END IF;
    RAISE EXCEPTION 'This UTR has already been submitted. Each payment reference can be used only once.';
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id;
  IF v_plan.id IS NULL OR NOT v_plan.active THEN
    RAISE EXCEPTION 'This plan is not available.';
  END IF;

  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = upper(btrim(p_coupon_code));
    IF v_coupon.id IS NULL OR NOT v_coupon.active OR v_coupon.plan_id <> v_plan.id
       OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now())
       OR (v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses) THEN
      RAISE EXCEPTION 'This coupon is not valid for this plan.';
    END IF;
    v_discount := LEAST(
      CASE WHEN v_coupon.discount_type = 'percent'
        THEN round(v_plan.price * v_coupon.discount_value / 100, 2)
        ELSE round(v_coupon.discount_value, 2)
      END,
      v_plan.price
    );
    v_coupon_id := v_coupon.id;
    v_coupon_code := v_coupon.code;
  END IF;

  INSERT INTO public.orders (
    user_id, plan_id, plan_name, coupon_id, coupon_code, customer_name,
    customer_email, customer_phone, original_amount, discount_amount,
    final_amount, utr, payment_status, telegram_access
  ) VALUES (
    NULL, v_plan.id, v_plan.name, v_coupon_id, v_coupon_code, btrim(p_name),
    lower(btrim(p_email)), btrim(p_phone), v_plan.price, v_discount,
    round(v_plan.price - v_discount, 2), v_utr, 'pending', false
  )
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This UTR has already been submitted. Each payment reference can be used only once.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.guest_submit_utr(p_order_ref text, p_email text, p_utr text, p_proof_path text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_order public.orders; v_utr text; v_dupe uuid;
BEGIN
  IF NOT public.is_valid_utr(p_utr) THEN
    RAISE EXCEPTION 'Enter a valid UTR: 6-40 letters/numbers including at least one digit';
  END IF;
  IF p_proof_path IS NOT NULL AND btrim(p_proof_path) <> '' AND btrim(p_proof_path) !~ '^[A-Za-z0-9._/-]{1,300}$' THEN
    RAISE EXCEPTION 'Invalid proof reference';
  END IF;

  v_utr := upper(btrim(p_utr));

  SELECT * INTO v_order FROM public.orders
   WHERE order_ref = upper(btrim(p_order_ref)) AND lower(customer_email) = lower(btrim(p_email));
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found. Check your reference and email.'; END IF;
  IF v_order.payment_status <> 'pending' THEN RAISE EXCEPTION 'This order has already been reviewed by the admin.'; END IF;

  IF v_order.utr IS NOT NULL AND upper(btrim(v_order.utr)) = v_utr THEN
    RAISE EXCEPTION 'This UTR is already submitted for this order and is awaiting admin review.';
  END IF;

  SELECT id INTO v_dupe FROM public.orders WHERE upper(btrim(utr)) = v_utr AND id <> v_order.id LIMIT 1;
  IF v_dupe IS NOT NULL THEN
    RAISE EXCEPTION 'This UTR has already been submitted for another order.';
  END IF;

  UPDATE public.orders
     SET utr = v_utr,
         proof_path = COALESCE(NULLIF(btrim(coalesce(p_proof_path,'')), ''), proof_path),
         updated_at = now()
   WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This UTR has already been submitted for another order.';
END;
$function$;