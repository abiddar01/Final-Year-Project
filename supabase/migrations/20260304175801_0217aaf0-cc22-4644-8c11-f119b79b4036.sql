
-- Add CNIC and rejection_reason to test_drive_bookings
ALTER TABLE public.test_drive_bookings ADD COLUMN IF NOT EXISTS cnic text;
ALTER TABLE public.test_drive_bookings ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create notification_log table
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.test_drive_bookings(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_by uuid
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert notification logs
CREATE POLICY "Admins can view notification logs"
ON public.notification_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notification logs"
ON public.notification_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anon/public insert for system-sent confirmations (from edge function)
CREATE POLICY "System can insert notification logs"
ON public.notification_log FOR INSERT TO anon
WITH CHECK (true);
