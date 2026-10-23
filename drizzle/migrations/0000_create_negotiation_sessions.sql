CREATE TABLE public.negotiation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  car_id uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  car_name text NOT NULL,
  status text NOT NULL DEFAULT 'OPENING',
  rounds_used integer NOT NULL DEFAULT 0,
  max_rounds integer NOT NULL DEFAULT 5,
  listed_price numeric NOT NULL DEFAULT 0,
  customer_offer numeric,
  counter_offer numeric,
  agreed_price numeric,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, UPDATE ON public.negotiation_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiation_sessions TO authenticated;
GRANT ALL ON public.negotiation_sessions TO service_role;

ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can save negotiation sessions"
ON public.negotiation_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update negotiation sessions"
ON public.negotiation_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view negotiation sessions"
ON public.negotiation_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete negotiation sessions"
ON public.negotiation_sessions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));