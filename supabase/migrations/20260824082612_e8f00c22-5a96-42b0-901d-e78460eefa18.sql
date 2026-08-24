INSERT INTO public.app_settings (key, value) VALUES
  ('upi_id', '9848779490@fam'),
  ('upi_payee_name', 'BOLLOJI HEMANTH'),
  ('upi_qr_url', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_payment_settings()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'upiId', COALESCE((SELECT value FROM public.app_settings WHERE key = 'upi_id'), '9848779490@fam'),
    'payeeName', COALESCE((SELECT value FROM public.app_settings WHERE key = 'upi_payee_name'), 'BOLLOJI HEMANTH'),
    'qrUrl', COALESCE((SELECT value FROM public.app_settings WHERE key = 'upi_qr_url'), '')
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_payment_settings(p_upi_id text, p_payee_name text, p_qr_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_upi text; v_name text; v_qr text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required.';
  END IF;

  v_upi := btrim(coalesce(p_upi_id, ''));
  v_name := btrim(coalesce(p_payee_name, ''));
  v_qr := btrim(coalesce(p_qr_url, ''));

  IF v_upi !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.]{1,32}$' THEN
    RAISE EXCEPTION 'Enter a valid UPI ID like name@bank';
  END IF;
  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Enter the payee name shown in UPI apps';
  END IF;
  IF v_qr <> '' AND v_qr !~ '^https?://' THEN
    RAISE EXCEPTION 'The QR image link must start with https://';
  END IF;

  INSERT INTO public.app_settings (key, value) VALUES ('upi_id', v_upi)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO public.app_settings (key, value) VALUES ('upi_payee_name', v_name)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO public.app_settings (key, value) VALUES ('upi_qr_url', v_qr)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'upiId', v_upi, 'payeeName', v_name, 'qrUrl', v_qr);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_payment_settings(text, text, text) TO authenticated;