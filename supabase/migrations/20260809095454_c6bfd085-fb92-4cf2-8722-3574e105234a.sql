-- test_drive_bookings: remove public SELECT
DROP POLICY IF EXISTS "Users can view own bookings by email" ON public.test_drive_bookings;
DROP POLICY IF EXISTS "Admins can view bookings" ON public.test_drive_bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.test_drive_bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.test_drive_bookings;
CREATE POLICY "Admins can view bookings" ON public.test_drive_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bookings" ON public.test_drive_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bookings" ON public.test_drive_bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contact_messages: admin policies restricted to authenticated
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- import_requests: admin policies restricted to authenticated
DROP POLICY IF EXISTS "Admins can view import requests" ON public.import_requests;
DROP POLICY IF EXISTS "Admins can update import requests" ON public.import_requests;
DROP POLICY IF EXISTS "Admins can delete import requests" ON public.import_requests;
CREATE POLICY "Admins can view import requests" ON public.import_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update import requests" ON public.import_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete import requests" ON public.import_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- chat_conversations / chat_messages: no public reads
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;
CREATE POLICY "Admins can view conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_preferences: no public reads
DROP POLICY IF EXISTS "Anyone can view preferences" ON public.user_preferences;
CREATE POLICY "Admins can view preferences" ON public.user_preferences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notification_log: remove anon insert
DROP POLICY IF EXISTS "System can insert notification logs" ON public.notification_log;
REVOKE INSERT ON public.notification_log FROM anon;

-- limit table grants to what policies actually allow
REVOKE SELECT ON public.test_drive_bookings FROM anon;
REVOKE SELECT ON public.chat_conversations FROM anon;
REVOKE SELECT ON public.chat_messages FROM anon;
REVOKE SELECT ON public.user_preferences FROM anon;

-- SECURITY DEFINER functions: trigger-only functions must not be API callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;