
CREATE TABLE public.test_drive_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_drive_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can book test drives" ON public.test_drive_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view bookings" ON public.test_drive_bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own bookings by email" ON public.test_drive_bookings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update bookings" ON public.test_drive_bookings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings" ON public.test_drive_bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
