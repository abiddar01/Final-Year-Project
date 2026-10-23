ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS negotiation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ideal_price_pkr numeric,
  ADD COLUMN IF NOT EXISTS target_price_pkr numeric,
  ADD COLUMN IF NOT EXISTS min_price_pkr numeric,
  ADD COLUMN IF NOT EXISTS max_discount_percent numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS max_negotiation_rounds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS negotiation_strategy text NOT NULL DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS allowed_incentives text[] NOT NULL DEFAULT '{}'::text[];