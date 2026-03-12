
-- Add language column to profiles
ALTER TABLE public.profiles ADD COLUMN language text NOT NULL DEFAULT 'en';

-- Create translations table
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  en text NOT NULL DEFAULT '',
  et text NOT NULL DEFAULT '',
  ru text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations (needed for UI)
CREATE POLICY "Anyone can read translations" ON public.translations
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify translations
CREATE POLICY "Admins can insert translations" ON public.translations
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update translations" ON public.translations
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete translations" ON public.translations
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow anon to read translations (for auth page before login)
CREATE POLICY "Anon can read translations" ON public.translations
  FOR SELECT TO anon USING (true);
