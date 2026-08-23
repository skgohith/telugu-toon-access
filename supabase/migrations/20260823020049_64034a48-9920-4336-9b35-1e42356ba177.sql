
-- Admin access rules (admins authenticate normally; RLS enforces role)
CREATE POLICY "admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public UPI id (settings table stays private)
CREATE OR REPLACE FUNCTION public.get_upi_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value FROM public.app_settings WHERE key = 'upi_id'), '9848779490@fam');
$$;

-- Guest coupon validation
CREATE OR REPLACE FUNCTION public.guest_validate_coupon(p_plan_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan public.plans; v_coupon public.coupons; v_discount numeric;
BEGIN
  SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id;
  IF v_plan.id IS NULL OR NOT v_plan.active THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This plan is not available right now.');
  END IF;
  SELECT * INTO v_coupon FROM public.coupons WHERE code = upper(btrim(p_code));
  IF v_coupon.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'This coupon code does not exist.'); END IF;
  IF NOT v_coupon.active THEN RETURN jsonb_build_object('ok', false, 'message', 'This coupon is no longer active.'); END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This coupon has expired.'); END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This coupon has reached its usage limit.'); END IF;
  IF v_coupon.plan_id <> p_plan_id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This coupon is not valid for this plan.'); END IF;

  v_discount := LEAST(
    CASE WHEN v_coupon.discount_type = 'percent'
      THEN round(v_plan.price * v_coupon.discount_value / 100, 2)
      ELSE round(v_coupon.discount_value, 2) END, v_plan.price);

  RETURN jsonb_build_object(
    'ok', true, 'message', 'Coupon applied successfully!', 'code', v_coupon.code,
    'discountType', v_coupon.discount_type, 'discountValue', v_coupon.discount_value,
    'originalAmount', v_plan.price, 'discountAmount', v_discount,
    'finalAmount', round(v_plan.price - v_discount, 2));
END;
$$;

-- Shared guest-safe order projection
CREATE OR REPLACE FUNCTION public.order_public_json(o public.orders)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', o.id, 'order_ref', o.order_ref, 'plan_id', o.plan_id, 'plan_name', o.plan_name,
    'coupon_code', o.coupon_code, 'customer_name', o.customer_name, 'customer_email', o.customer_email,
    'customer_phone', o.customer_phone, 'original_amount', o.original_amount,
    'discount_amount', o.discount_amount, 'final_amount', o.final_amount, 'utr', o.utr,
    'proof_path', o.proof_path, 'payment_status', o.payment_status,
    'telegram_access', o.telegram_access, 'approved_at', o.approved_at,
    'rejected_at', o.rejected_at, 'created_at', o.created_at);
$$;

-- Guest checkout: amounts computed in the database, never trusted from the client
CREATE OR REPLACE FUNCTION public.guest_create_order(
  p_plan_id uuid, p_coupon_code text, p_name text, p_email text, p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan public.plans; v_coupon public.coupons; v_discount numeric := 0;
        v_coupon_id uuid; v_coupon_code text; v_order public.orders;
BEGIN
  IF btrim(coalesce(p_name,'')) = '' OR length(btrim(p_name)) < 2 THEN RAISE EXCEPTION 'Enter your full name'; END IF;
  IF p_email IS NULL OR position('@' in p_email) < 2 THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  IF btrim(coalesce(p_phone,'')) !~ '^[0-9+\-\s]{8,15}$' THEN RAISE EXCEPTION 'Enter a valid mobile number'; END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id;
  IF v_plan.id IS NULL OR NOT v_plan.active THEN RAISE EXCEPTION 'This plan is not available.'; END IF;

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
        ELSE round(v_coupon.discount_value, 2) END, v_plan.price);
    v_coupon_id := v_coupon.id; v_coupon_code := v_coupon.code;
  END IF;

  INSERT INTO public.orders (user_id, plan_id, plan_name, coupon_id, coupon_code, customer_name,
    customer_email, customer_phone, original_amount, discount_amount, final_amount,
    payment_status, telegram_access)
  VALUES (NULL, v_plan.id, v_plan.name, v_coupon_id, v_coupon_code, btrim(p_name),
    lower(btrim(p_email)), btrim(p_phone), v_plan.price, v_discount,
    round(v_plan.price - v_discount, 2), 'pending', false)
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
END;
$$;

-- Guest order tracking (reference + email act as the credential)
CREATE OR REPLACE FUNCTION public.guest_track_order(p_order_ref text, p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders
   WHERE order_ref = upper(btrim(p_order_ref)) AND lower(customer_email) = lower(btrim(p_email));
  IF v_order.id IS NULL THEN RETURN 'null'::jsonb; END IF;
  RETURN public.order_public_json(v_order);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_submit_utr(
  p_order_ref text, p_email text, p_utr text, p_proof_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders;
BEGIN
  IF btrim(coalesce(p_utr,'')) !~ '^[A-Za-z0-9-]{6,40}$' THEN
    RAISE EXCEPTION 'UTR can contain only letters, numbers and dashes (min 6 characters)'; END IF;
  IF p_proof_path IS NOT NULL AND btrim(p_proof_path) <> '' AND btrim(p_proof_path) !~ '^[A-Za-z0-9._/-]{1,300}$' THEN
    RAISE EXCEPTION 'Invalid proof reference'; END IF;

  SELECT * INTO v_order FROM public.orders
   WHERE order_ref = upper(btrim(p_order_ref)) AND lower(customer_email) = lower(btrim(p_email));
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found. Check your reference and email.'; END IF;
  IF v_order.payment_status <> 'pending' THEN RAISE EXCEPTION 'This order has already been reviewed by the admin.'; END IF;

  UPDATE public.orders
     SET utr = upper(btrim(p_utr)),
         proof_path = COALESCE(NULLIF(btrim(coalesce(p_proof_path,'')), ''), proof_path),
         updated_at = now()
   WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN public.order_public_json(v_order);
END;
$$;

-- Telegram invite link released only for approved orders
CREATE OR REPLACE FUNCTION public.guest_telegram_access(p_order_ref text, p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders; v_link text;
BEGIN
  SELECT * INTO v_order FROM public.orders
   WHERE order_ref = upper(btrim(p_order_ref)) AND lower(customer_email) = lower(btrim(p_email));
  IF v_order.id IS NULL OR v_order.payment_status <> 'completed' OR NOT v_order.telegram_access THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Telegram access unlocks after your payment is verified.');
  END IF;
  SELECT telegram_link INTO v_link FROM public.plans WHERE id = v_order.plan_id;
  IF v_link IS NULL OR btrim(v_link) = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invite link is being prepared. Please contact support.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'link', v_link, 'planName', v_order.plan_name);
END;
$$;

-- Admin: approve / reject with atomic coupon usage accounting
CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden: admin access required.'; END IF;
  IF p_status NOT IN ('completed','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found.'; END IF;

  IF p_status = 'completed' THEN
    UPDATE public.orders SET payment_status = 'completed', telegram_access = true,
      approved_at = now(), rejected_at = NULL, approved_by = auth.uid(), updated_at = now()
     WHERE id = p_order_id;
    IF v_order.payment_status <> 'completed' AND v_order.coupon_id IS NOT NULL THEN
      UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_order.coupon_id;
    END IF;
  ELSE
    UPDATE public.orders SET payment_status = 'rejected', telegram_access = false,
      rejected_at = now(), approved_at = NULL, approved_by = auth.uid(), updated_at = now()
     WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Admin: bulk data cleanup
CREATE OR REPLACE FUNCTION public.admin_clear_data(p_scope text, p_confirm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden: admin access required.'; END IF;
  IF p_confirm <> 'DELETE' THEN RAISE EXCEPTION 'Type DELETE to confirm.'; END IF;

  IF p_scope = 'coupons' THEN
    DELETE FROM public.coupons;
  ELSIF p_scope = 'customers' THEN
    DELETE FROM public.orders;
    DELETE FROM public.profiles WHERE id <> auth.uid();
  ELSIF p_scope = 'all' THEN
    DELETE FROM public.orders;
    DELETE FROM public.coupons;
    DELETE FROM public.profiles WHERE id <> auth.uid();
  ELSIF p_scope IN ('pending','completed','rejected') THEN
    DELETE FROM public.orders WHERE payment_status = p_scope;
  ELSE
    RAISE EXCEPTION 'Unknown scope';
  END IF;

  RETURN jsonb_build_object('ok', true, 'cleared', p_scope);
END;
$$;

REVOKE ALL ON FUNCTION public.guest_validate_coupon(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_create_order(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_track_order(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_submit_utr(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_telegram_access(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_upi_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_clear_data(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.guest_validate_coupon(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_create_order(uuid, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_track_order(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_submit_utr(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_telegram_access(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_upi_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clear_data(text, text) TO authenticated, service_role;
