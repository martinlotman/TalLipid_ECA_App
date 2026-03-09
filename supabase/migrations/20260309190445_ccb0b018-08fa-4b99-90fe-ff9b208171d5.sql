
-- Admins can read ALL profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update ALL profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read ALL daily_logs
CREATE POLICY "Admins can read all daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read all chat conversations
CREATE POLICY "Admins can read all conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read all chat messages
CREATE POLICY "Admins can read all messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
