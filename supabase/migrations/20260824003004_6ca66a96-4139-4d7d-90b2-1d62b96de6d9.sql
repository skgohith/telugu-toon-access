CREATE OR REPLACE FUNCTION public.order_public_json(o public.orders)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
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