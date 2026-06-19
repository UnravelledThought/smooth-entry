ALTER TABLE public.profiles ADD COLUMN uid BIGSERIAL UNIQUE;

-- Backfill existing profiles in creation order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.profiles
)
UPDATE public.profiles p SET uid = o.rn FROM ordered o WHERE p.id = o.id;

-- Reset sequence to max
SELECT setval(pg_get_serial_sequence('public.profiles', 'uid'), COALESCE((SELECT MAX(uid) FROM public.profiles), 0) + 1, false);

-- Update handle_new_user to not need to set uid (sequence handles it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$function$;