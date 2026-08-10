import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.jikan.moe/v4";

// The client never sends a URL or a cache key. It sends a small, closed set of
// intents and the server derives both — so this function can't be used as an
// open proxy or to write arbitrary rows into the cache table.
type CacheRequest =
  | { kind: "top" }
  | { kind: "season" }
  | { kind: "detail"; id: number }
  | { kind: "search"; q: string };

const MAX_QUERY_LEN = 60;
// Letters (incl. accents/CJK), digits, spaces and a few title characters.
const QUERY_OK = /^[\p{L}\p{N} .,!?:'&+*/#\-]+$/u;

function normalizeQuery(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Invalid search term");
  const q = raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_QUERY_LEN);
  if (q.length < 2) throw new Error("Search term too short");
  if (!QUERY_OK.test(q)) throw new Error("Search term contains unsupported characters");
  return q;
}

function validate(input: unknown): CacheRequest {
  const req = input as { kind?: unknown; id?: unknown; q?: unknown } | null;
  switch (req?.kind) {
    case "top":
      return { kind: "top" };
    case "season":
      return { kind: "season" };
    case "detail": {
      const id = Number(req.id);
      if (!Number.isInteger(id) || id < 1 || id > 99_999_999) throw new Error("Invalid anime id");
      return { kind: "detail", id };
    }
    case "search":
      return { kind: "search", q: normalizeQuery(req.q) };
    default:
      throw new Error("Unsupported request");
  }
}

function resolve(req: CacheRequest): { key: string; path: string } {
  switch (req.kind) {
    case "top":
      return { key: "top", path: "top/anime?limit=18" };
    case "season":
      return { key: "season", path: "seasons/now?limit=12" };
    case "detail":
      return { key: `a:${req.id}`, path: `anime/${req.id}` };
    case "search":
      return {
        key: `q:${req.q}`,
        path: `anime?q=${encodeURIComponent(req.q)}&limit=20&sfw=true`,
      };
  }
}

// Search rows are the only unbounded part of the cache; drop stale ones so a
// flood of one-off terms can't grow the table forever.
const SEARCH_TTL_DAYS = 90;

export const fetchAnimeCached = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const { key, path } = resolve(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Try cache (anime metadata is stable enough to keep indefinitely).
    const { data: hit } = await supabaseAdmin
      .from("anime_cache")
      .select("data")
      .eq("cache_key", key)
      .maybeSingle();

    if (hit?.data) return hit.data as unknown;

    // 2. Cache miss — fetch upstream and persist.
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) {
      // Don't poison cache with errors; surface a soft failure.
      throw new Error(`Upstream ${res.status}`);
    }
    const json = await res.json();
    const payload = json?.data ?? null;

    // Upsert (ignore conflicts from racing requests).
    await supabaseAdmin
      .from("anime_cache")
      .upsert({ cache_key: key, data: payload, cached_at: new Date().toISOString() });

    if (data.kind === "search") {
      const cutoff = new Date(Date.now() - SEARCH_TTL_DAYS * 86_400_000).toISOString();
      await supabaseAdmin
        .from("anime_cache")
        .delete()
        .like("cache_key", "q:%")
        .lt("cached_at", cutoff);
    }

    return payload;
  });
