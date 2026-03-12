
-- Table for admin-pushed in-app notifications
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sent_by uuid NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_user_id);

-- Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
