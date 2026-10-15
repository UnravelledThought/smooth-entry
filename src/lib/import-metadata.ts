import { getAnimeSummaries } from "./anime/service";
import { getEntriesSnapshot, updateEntry } from "./local-store";

let pending: Promise<number> | null = null;

export function needsImportMetadata(entry: ReturnType<typeof getEntriesSnapshot>[number]) {
  return entry.mal_id != null && (!entry.image_url || /\/images\/anime\/1\/\d+\.jpg$/.test(entry.image_url) || entry.duration == null);
}

/** Repair legacy imports too, without touching progress, scores, or watch state. */
export function hydrateImportedEntries(): Promise<number> {
  if (pending) return pending;
  pending = (async () => {
    const entries = getEntriesSnapshot().filter(needsImportMetadata);
    const ids = entries.flatMap((entry) => entry.mal_id == null ? [] : [entry.mal_id]);
    if (ids.length === 0) return 0;
    const anime = await getAnimeSummaries(ids);
    const byMal = new Map(anime.map((item) => [item.mal_id, item]));
    let repaired = 0;
    for (const entry of getEntriesSnapshot()) {
      if (!needsImportMetadata(entry)) continue;
      const item = byMal.get(entry.mal_id);
      if (!item) continue;
      updateEntry(entry.id, {
        image_url: item.images.cover || entry.image_url,
        banner_url: item.images.banner,
        duration: item.duration,
        anilist_id: item.anilist_id,
        anilist_score: item.anilist_score,
        episodes: entry.episodes ?? item.episodes,
      });
      if (item.images.cover) repaired++;
    }
    return repaired;
  })().finally(() => { pending = null; });
  return pending;
}