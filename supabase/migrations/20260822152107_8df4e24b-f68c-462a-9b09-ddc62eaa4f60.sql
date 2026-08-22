ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
DROP POLICY IF EXISTS "own orders select" ON public.orders;