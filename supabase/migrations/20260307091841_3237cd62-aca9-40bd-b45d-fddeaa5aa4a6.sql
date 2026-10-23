
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS availability_type text NOT NULL DEFAULT 'in_showroom';
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS estimated_import_days integer NULL;

CREATE TABLE IF NOT EXISTS public.import_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit import requests" ON public.import_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view import requests" ON public.import_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update import requests" ON public.import_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
