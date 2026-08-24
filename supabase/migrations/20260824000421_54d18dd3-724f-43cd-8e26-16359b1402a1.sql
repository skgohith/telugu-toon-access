ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS instagram_username text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_username text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.order_public_json(o orders)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', o.id, 'order_ref', o.order_ref, 'plan_id', o.plan_id, 'plan_name', o.plan_name,
    'coupon_code', o.coupon_code, 'customer_name', o.customer_name, 'customer_email', o.customer_email,
    'customer_phone', o.customer_phone, 'instagram_username', o.instagram_username,
    'telegram_username', o.telegram_username,
    'original_amount', o.original_amount,
    'discount_amount', o.discount_amount, 'final_amount', o.final_amount, 'utr', o.utr,
    'proof_path', o.proof_path, 'payment_status', o.payment_status,
    'telegram_access', o.telegram_access, 'approved_at', o.approved_at,
    'rejected_at', o.rejected_at, 'created_at', o.created_at);
$function$;

CREATE OR REPLACE FUNCTION public.guest_create_paid_order(
  p_plan_id uuid, p_coupon_code text, p_name text, p_email text, p_phone text, p_utr text,
  p_instagram text DEFAULT NULL, p_telegram text DEFAULT NULL)
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
  v_ig text;
  v_tg text;
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

  v_ig := btrim(regexp_replace(coalesce(p_instagram, ''), '^@', ''));
  v_tg := btrim(regexp_replace(coalesce(p_telegram, ''), '^@', ''));
  IF v_ig = '' AND v_tg = '' THEN
    RAISE EXCEPTION 'Enter your Instagram or Telegram username (at least one).';
  END IF;
  IF v_ig <> '' AND v_ig !~ '^[A-Za-z0-9._]{2,40}$' THEN
    RAISE EXCEPTION 'Enter a valid Instagram username';
  END IF;
  IF v_tg <> '' AND v_tg !~ '^[A-Za-z0-9._]{2,40}$' THEN
    RAISE EXCEPTION 'Enter a valid Telegram username';
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
    customer_email, customer_phone, instagram_username, telegram_username,
    original_amount, discount_amount, final_amount, utr, payment_status, telegram_access
  ) VALUES (
    NULL, v_plan.id, v_plan.name, v_coupon_id, v_coupon_code, btrim(p_name),
    lower(btrim(p_email)), btrim(p_phone), v_ig, v_tg, v_plan.price, v_discount,
    round(v_plan.price - v_discount, 2), v_utr, 'pending', false
  )
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This UTR has already been submitted. Each payment reference can be used only once.';
END;
$function$;