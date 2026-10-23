
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS city_highway text NULL;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS luxury_importance text NULL;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS tech_importance text NULL;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS brand_preference text NULL;
