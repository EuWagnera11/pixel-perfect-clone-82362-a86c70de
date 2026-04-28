-- ============================================================
-- Bucket 'previews' pra hospedar previews de templates/presets/worlds.
-- Público (servido via CDN) — RLS só governa upload (service_role only).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('previews', 'previews', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Anyone reads (público pra CDN)
DROP POLICY IF EXISTS "Public read previews" ON storage.objects;
CREATE POLICY "Public read previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'previews');

-- Só service_role pode escrever (workers do FastAPI)
DROP POLICY IF EXISTS "Service role writes previews" ON storage.objects;
CREATE POLICY "Service role writes previews"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'previews');

DROP POLICY IF EXISTS "Service role updates previews" ON storage.objects;
CREATE POLICY "Service role updates previews"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'previews')
WITH CHECK (bucket_id = 'previews');
