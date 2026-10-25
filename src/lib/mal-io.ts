import { addManyEntries, type LocalEntry, type WatchStatus } from "./local-store";
import { hydrateImportedEntries } from "./import-metadata";

// MyAnimeList XML export format compatibility.
// Reference: https://myanimelist.net/panel.php?go=export

const MAL_TO_STATUS: Record<string, WatchStatus> = {
  watching: "watching",
  "1": "watching",
  completed: "completed",
  "2": "completed",
  onhold: "onhold",
  "on-hold": "onhold",
  "3": "onhold",
  dropped: "dropped",
  "4": "dropped",
  plantowatch: "plan",
  "plan to watch": "plan",
  "6": "plan",
};

const STATUS_TO_MAL: Record<WatchStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  onhold: "On-Hold",
  plan: "Plan to Watch",
  dropped: "Dropped",
};

function esc(s: string | number | null | undefined) {
  return String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}

/** MAL can only accept titles that have a MyAnimeList id. */
export function malExportable(entries: LocalEntry[]): LocalEntry[] {
  return entries.filter((e) => e.mal_id != null);
}

export function toMalXml(all: LocalEntry[]): string {
  const entries = malExportable(all);
  const completed = entries.filter((e) => e.status === "completed").length;
  const watching = entries.filter((e) => e.status === "watching").length;
  const plan = entries.filter((e) => e.status === "plan").length;
  const dropped = entries.filter((e) => e.status === "dropped").length;

  const items = entries
    .map(
      (e) => `  <anime>
    <series_animedb_id>${e.mal_id}</series_animedb_id>
    <series_title>${esc(e.title)}</series_title>
    <series_episodes>${e.episodes ?? 0}</series_episodes>
    <my_watched_episodes>${e.progress ?? 0}</my_watched_episodes>
    <my_score>${e.personal_score != null ? Math.round(e.personal_score) : 0}</my_score>
    <my_status>${esc(STATUS_TO_MAL[e.status])}</my_status>
    <update_on_import>1</update_on_import>
  </anime>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <myinfo>
    <user_export_type>1</user_export_type>
    <user_total_anime>${entries.length}</user_total_anime>
    <user_total_watching>${watching}</user_total_watching>
    <user_total_completed>${completed}</user_total_completed>
    <user_total_onhold>${entries.filter((e) => e.status === "onhold").length}</user_total_onhold>
    <user_total_dropped>${dropped}</user_total_dropped>
    <user_total_plantowatch>${plan}</user_total_plantowatch>
  </myinfo>
${items}
</myanimelist>`;
}

export interface ParsedEntry {
  mal_id: number;
  title: string;
  episodes: number | null;
  progress: number;
  personal_score: number | null;
  status: WatchStatus;
}

export function parseMalXml(xml: string): ParsedEntry[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid XML file");
  const nodes = Array.from(doc.getElementsByTagName("anime"));
  const out: ParsedEntry[] = [];
  for (const n of nodes) {
    const id = Number(n.getElementsByTagName("series_animedb_id")[0]?.textContent?.trim());
    if (!id) continue;
    const title = n.getElementsByTagName("series_title")[0]?.textContent?.trim() ?? `#${id}`;
    const eps = Number(n.getElementsByTagName("series_episodes")[0]?.textContent?.trim());
    const progress = Number(n.getElementsByTagName("my_watched_episodes")[0]?.textContent?.trim() || "0");
    const score = Number(n.getElementsByTagName("my_score")[0]?.textContent?.trim() || "0");
    const statusRaw = (n.getElementsByTagName("my_status")[0]?.textContent?.trim() || "plantowatch").toLowerCase().replace(/\s+/g, "");
    const status: WatchStatus = MAL_TO_STATUS[statusRaw] ?? "plan";
    out.push({
      mal_id: id,
      title,
      episodes: Number.isFinite(eps) && eps > 0 ? eps : null,
      progress: Number.isFinite(progress) ? progress : 0,
      personal_score: score > 0 ? score : null,
      status,
    });
  }
  return out;
}

export async function importEntries(parsed: ParsedEntry[]): Promise<{ imported: number; skipped: number; missingArtwork: number }> {
  if (parsed.length === 0) return { imported: 0, skipped: 0, missingArtwork: 0 };
  const result = addManyEntries(
    parsed.map((p) => ({
      mal_id: p.mal_id,
      title: p.title,
      image_url: "",
      episodes: p.episodes,
      progress: p.progress,
      personal_score: p.personal_score,
      mal_score: null,
      status: p.status,
    })),
  );
  try {
    await hydrateImportedEntries();
  } catch {
    // The list remains imported even if artwork is temporarily unavailable.
  }
  const { getEntriesSnapshot } = await import("./local-store");
  const ids = new Set(parsed.map((entry) => entry.mal_id));
  const missingArtwork = getEntriesSnapshot().filter((entry) => ids.has(entry.mal_id ?? 0) && (!entry.image_url || /\/images\/anime\/1\/\d+\.jpg$/.test(entry.image_url))).length;
  return { ...result, missingArtwork };
}
