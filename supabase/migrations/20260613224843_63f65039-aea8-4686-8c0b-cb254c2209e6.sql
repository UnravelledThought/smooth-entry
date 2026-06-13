
-- Status enum
CREATE TYPE public.watch_status AS ENUM ('watching','completed','plan','dropped');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  accent_color TEXT NOT NULL DEFAULT '#ffffff',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$')
);
CREATE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- WATCHLIST ENTRIES
CREATE TABLE public.watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  episodes INT,
  status public.watch_status NOT NULL DEFAULT 'plan',
  progress INT NOT NULL DEFAULT 0,
  personal_score NUMERIC(3,1),
  mal_score NUMERIC(3,2),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id)
);
CREATE INDEX watchlist_shared_idx ON public.watchlist_entries (shared_at DESC) WHERE is_shared = true;
CREATE INDEX watchlist_user_idx ON public.watchlist_entries (user_id);

GRANT SELECT ON public.watchlist_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_entries TO authenticated;
GRANT ALL ON public.watchlist_entries TO service_role;

ALTER TABLE public.watchlist_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see all their entries" ON public.watchlist_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone sees shared or pinned" ON public.watchlist_entries FOR SELECT USING (is_shared = true OR is_pinned = true);
CREATE POLICY "Owners insert" ON public.watchlist_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update" ON public.watchlist_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete" ON public.watchlist_entries FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER watchlist_updated_at BEFORE UPDATE ON public.watchlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile from auth.users metadata.username
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
