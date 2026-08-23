CREATE OR REPLACE FUNCTION public.guest_create_paid_order(
  p_plan_id uuid,
  p_coupon_code text,
  p_name text,
  p_email text,
  p_phone text,
  p_utr text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans;
  v_coupon public.coupons;
  v_discount numeric := 0;
  v_coupon_id uuid;
  v_coupon_code text;
  v_order public.orders;
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
  IF btrim(coalesce(p_utr, '')) !~ '^[A-Za-z0-9-]{6,40}$' THEN
    RAISE EXCEPTION 'UTR can contain only letters, numbers and dashes (min 6 characters)';
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
    round(v_plan.price - v_discount, 2), upper(btrim(p_utr)), 'pending', false
  )
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.guest_create_paid_order(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_create_paid_order(uuid, text, text, text, text, text) TO anon, authenticated, service_role;