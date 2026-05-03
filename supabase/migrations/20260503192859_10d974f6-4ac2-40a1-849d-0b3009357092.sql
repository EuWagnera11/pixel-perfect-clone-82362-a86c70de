-- Expand generations
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS tool text,
  ADD COLUMN IF NOT EXISTS op text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS freepik_endpoint text,
  ADD COLUMN IF NOT EXISTS refs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS envelope_version text,
  ADD COLUMN IF NOT EXISTS raw_prompt text,
  ADD COLUMN IF NOT EXISTS final_prompt text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS parent_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS generations_user_created_idx
  ON public.generations(user_id, created_at DESC);

-- proxy_logs
CREATE TABLE IF NOT EXISTS public.proxy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  generation_id uuid,
  endpoint_key text,
  attempted_url text,
  request_body jsonb,
  response_status int,
  response_body jsonb,
  duration_ms int
);

ALTER TABLE public.proxy_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read proxy logs" ON public.proxy_logs;
CREATE POLICY "Admins read proxy logs" ON public.proxy_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket: uploads (public — Freepik needs to fetch)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Users upload own folder" ON storage.objects;
CREATE POLICY "Users upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own folder" ON storage.objects;
CREATE POLICY "Users update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own folder" ON storage.objects;
CREATE POLICY "Users delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);