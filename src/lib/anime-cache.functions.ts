import { createServerFn } from "@tanstack/react-start";

const BASE = "https://api.jikan.moe/v4";

// Endpoints clients are allowed to fetch through the shared cache.
// Anything not on this list is rejected so the server fn can't be abused
// as an open proxy.
const ALLOWED = new Set<string>([
  "top/anime?limit=18",
  "seasons/now?limit=12",
  "anime?status=airing&order_by=start_date&sort=desc&limit=12&sfw=true",
]);


function isAllowed(path: string): boolean {
  if (ALLOWED.has(path)) return true;
  // /anime/<id>
  if (/^anime\/\d+$/.test(path)) return true;
  // /anime?q=<term>&limit=20&sfw=true
  if (/^anime\?q=[^&]+&limit=20&sfw=true$/.test(path)) return true;
  return false;
}

export const fetchAnimeCached = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; path: string }) => {
    if (!input?.key || !input?.path) throw new Error("key and path required");
    if (input.key.length > 200) throw new Error("key too long");
    if (!isAllowed(input.path)) throw new Error("path not allowed");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Try cache (never expires — anime metadata is stable enough).
    const { data: hit } = await supabaseAdmin
      .from("anime_cache")
      .select("data")
      .eq("cache_key", data.key)
      .maybeSingle();

    if (hit?.data) return hit.data as unknown;

    // 2. Cache miss — fetch upstream and persist.
    const res = await fetch(`${BASE}/${data.path}`);
    if (!res.ok) {
      // Don't poison cache with errors; surface a soft failure.
      throw new Error(`Upstream ${res.status}`);
    }
    const json = await res.json();
    const payload = json?.data ?? null;

    // Upsert (ignore conflicts from racing requests).
    await supabaseAdmin
      .from("anime_cache")
      .upsert({ cache_key: data.key, data: payload, cached_at: new Date().toISOString() });

    return payload;
  });
