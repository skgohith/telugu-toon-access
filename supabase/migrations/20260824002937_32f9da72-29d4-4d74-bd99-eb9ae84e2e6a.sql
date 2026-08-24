ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_email_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS access_email_error text,
  ADD COLUMN IF NOT EXISTS access_email_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_email_sent_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_access_email_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_access_email_status_check
  CHECK (access_email_status IN ('not_sent','sending','sent','failed','suppressed'));

CREATE OR REPLACE FUNCTION public.order_public_json(o public.orders)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'order_ref', o.order_ref,
    'plan_name', o.plan_name,
    'plan_id', o.plan_id,
    'coupon_code', o.coupon_code,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'original_amount', o.original_amount,
    'discount_amount', o.discount_amount,
    'final_amount', o.final_amount,
    'utr', o.utr,
    'proof_path', o.proof_path,
    'payment_status', o.payment_status,
    'telegram_access', o.telegram_access,
    'approved_at', o.approved_at,
    'rejected_at', o.rejected_at,
    'created_at', o.created_at,
    'access_email_status', o.access_email_status,
    'access_email_error', o.access_email_error,
    'access_email_attempts', o.access_email_attempts,
    'access_email_sent_at', o.access_email_sent_at
  )
$$;

-- Returns everything needed to render the invite email, only for approved orders.
CREATE OR REPLACE FUNCTION public.guest_email_context(p_order_ref text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  v_link text;
BEGIN
  SELECT * INTO o FROM public.orders
   WHERE upper(btrim(order_ref)) = upper(btrim(coalesce(p_order_ref,'')))
     AND lower(btrim(customer_email)) = lower(btrim(coalesce(p_email,'')))
   LIMIT 1;

  IF o.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order not found.');
  END IF;
  IF o.payment_status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order is not approved yet.');
  END IF;

  SELECT telegram_link INTO v_link FROM public.plans WHERE id = o.plan_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'order_ref', o.order_ref,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'plan_name', o.plan_name,
    'final_amount', o.final_amount,
    'telegram_link', v_link,
    'access_email_status', o.access_email_status,
    'access_email_attempts', o.access_email_attempts
  );
END;
$$;

-- Records the outcome of an invite-email attempt. Only touches email status columns
-- and only for approved orders.
CREATE OR REPLACE FUNCTION public.record_access_email_result(p_order_id uuid, p_status text, p_error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
BEGIN
  IF p_status NOT IN ('sending','sent','failed','suppressed') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid status.');
  END IF;

  UPDATE public.orders
     SET access_email_status = p_status,
         access_email_error = CASE WHEN p_status = 'failed' THEN left(coalesce(p_error,''), 500) ELSE NULL END,
         access_email_sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE access_email_sent_at END,
         access_email_attempts = CASE WHEN p_status = 'sending' THEN access_email_attempts + 1 ELSE access_email_attempts END
   WHERE id = p_order_id
     AND payment_status = 'completed'
  RETURNING * INTO o;

  IF o.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order not found or not approved.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'access_email_status', o.access_email_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_email_context(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_access_email_result(uuid, text, text) TO anon, authenticated;