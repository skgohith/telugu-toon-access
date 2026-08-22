ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_path text;

CREATE POLICY "anyone can upload payment proof"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "admins can read payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));