
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  medication_taken boolean,
  steps integer,
  sleep_hours numeric(3,1),
  heart_rate integer,
  spo2 integer,
  stress_level integer,
  sync_source text CHECK (sync_source IN ('watch', 'manual')),
  synced_to_redcap boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.daily_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.daily_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.daily_logs FOR UPDATE USING (true);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
