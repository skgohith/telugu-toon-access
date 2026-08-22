ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS telegram_link text;

UPDATE public.plans
SET telegram_link = 'https://t.me/+cXaK-hiuuYQ3ZDk1'
WHERE name = 'Lite Premium';

UPDATE public.plans
SET telegram_link = 'https://t.me/+V3V6h5fxHWozZGZl'
WHERE name = 'Max Premium';