-- Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('persona-photos', 'persona-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('generation-refs', 'generation-refs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Helper: files are stored under <user_id>/<filename>
-- persona-photos (private)
CREATE POLICY "persona_photos_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'persona-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "persona_photos_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'persona-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "persona_photos_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'persona-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "persona_photos_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'persona-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars (public read, own write)
CREATE POLICY "avatars_public_select" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- generation-refs (private)
CREATE POLICY "gen_refs_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'generation-refs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gen_refs_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'generation-refs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gen_refs_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'generation-refs' AND auth.uid()::text = (storage.foldername(name))[1]);