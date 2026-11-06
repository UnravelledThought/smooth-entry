ALTER TYPE public.watch_status ADD VALUE IF NOT EXISTS 'onhold';
ALTER TABLE public.watchlist_entries
  ADD COLUMN IF NOT EXISTS anilist_id bigint,
  ADD COLUMN IF NOT EXISTS alt_titles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS duration integer,
  ADD COLUMN IF NOT EXISTS anilist_score numeric;
ALTER TABLE public.watchlist_entries ALTER COLUMN mal_id DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN accent_color SET DEFAULT '#ff2d6f';
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.watchlist_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_entries TO authenticated;
GRANT ALL ON public.watchlist_entries TO service_role;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar own insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar own update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar own delete" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);