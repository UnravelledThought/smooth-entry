CREATE TABLE public.anime_cache (
  cache_key text PRIMARY KEY,
  data jsonb NOT NULL,
  cached_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.anime_cache TO anon, authenticated;
GRANT ALL ON public.anime_cache TO service_role;
ALTER TABLE public.anime_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cache is publicly readable" ON public.anime_cache FOR SELECT USING (true);