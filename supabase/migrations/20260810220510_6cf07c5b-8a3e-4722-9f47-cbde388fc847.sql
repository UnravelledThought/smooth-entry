DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;

CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(name) ~ '\.(jpg|jpeg|png|gif)$'
  );

CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(name) ~ '\.(jpg|jpeg|png|gif)$'
  );