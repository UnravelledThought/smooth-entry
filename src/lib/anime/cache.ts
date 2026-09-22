/**
 * Versioned browser cache for anime data. One record per source so an AniList
 * refresh can never clobber MyAnimeList data (or vice versa). Only successful
 * responses are ever written.
 */

const PREFIX = "anitrack.v2.";

export interface CacheRecord<T> {
  data: T;
  last_synced_at: string;
}

export const TTL = {
  metadata: 7 * 24 * 60 * 60 * 1000,
  mal: 24 * 60 * 60 * 1000,
  episodes: 3 * 24 * 60 * 60 * 1000,
  search: 60 * 60 * 1000,
  list: 6 * 60 * 60 * 1000,
} as const;

function key(k: string) {
  return PREFIX + k;
}

export function cacheRead<T>(k: string): CacheRecord<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(k));
    if (!raw) return null;
    const rec = JSON.parse(raw) as CacheRecord<T>;
    if (!rec || typeof rec.last_synced_at !== "string") return null;
    return rec;
  } catch {
    return null;
  }
}

export function cacheWrite<T>(k: string, data: T): CacheRecord<T> {
  const rec: CacheRecord<T> = { data, last_synced_at: new Date().toISOString() };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key(k), JSON.stringify(rec));
    } catch {
      pruneOldest();
      try {
        window.localStorage.setItem(key(k), JSON.stringify(rec));
      } catch {
        /* best effort */
      }
    }
  }
  return rec;
}

export function cacheDrop(k: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(k));
  } catch {
    /* ignore */
  }
}

export function isStale(rec: CacheRecord<unknown> | null, ttl: number): boolean {
  if (!rec) return true;
  return Date.now() - Date.parse(rec.last_synced_at) > ttl;
}

/** Drop roughly the oldest half of our cache entries when storage is full. */
function pruneOldest() {
  if (typeof window === "undefined") return;
  const rows: Array<{ k: string; t: number }> = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    let t = 0;
    try {
      t = Date.parse(JSON.parse(window.localStorage.getItem(k) || "{}").last_synced_at) || 0;
    } catch {
      /* treat as oldest */
    }
    rows.push({ k, t });
  }
  rows.sort((a, b) => a.t - b.t);
  for (const r of rows.slice(0, Math.max(1, Math.floor(rows.length / 2)))) {
    try {
      window.localStorage.removeItem(r.k);
    } catch {
      /* ignore */
    }
  }
}

export function clearAnimeCache() {
  if (typeof window === "undefined") return;
  const doomed: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) doomed.push(k);
  }
  doomed.forEach((k) => window.localStorage.removeItem(k));
}
