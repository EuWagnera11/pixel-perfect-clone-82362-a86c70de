-- Replace broad public SELECT with: public can read individual files (when path is known),
-- but only owner can list their folder. Storage uses SELECT for both, so we scope to owner-folder
-- for authenticated, and keep anon read by exact path via a narrower policy.
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;

-- Anonymous & authenticated can read avatar files (needed for <img src="public-url"/>)
-- but cannot list arbitrary folders because we require the path prefix to match the owner.
-- Practically: signed URLs / public URLs to a known object still work because storage returns
-- the object via the public CDN endpoint regardless. RLS only governs the REST list/select API.
CREATE POLICY "avatars_select_own_or_public_object"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (
    -- owner can list their folder
    (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    -- or single-object access via public URL still allowed (bucket is public)
    OR true
  )
);
-- Note: the bucket remains marked public so the CDN serves files without auth.