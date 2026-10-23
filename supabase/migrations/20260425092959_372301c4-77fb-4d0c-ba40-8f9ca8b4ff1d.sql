-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (public) can submit a message
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update (status changes)
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete import_requests (was missing)
CREATE POLICY "Admins can delete import requests"
ON public.import_requests
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));