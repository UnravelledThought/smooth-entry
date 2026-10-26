/**
 * AniList client — the canonical source for anime metadata.
 * Never reads or writes MyAnimeList-owned fields (`anime.mal`).
 */

import type {
  Anime,
  AnimeRanking,
  AnimeRecommendation,
  AnimeRelation,
  AnimeTag,
  CharacterCredit,
  NamedRef,
  StaffCredit,
  StreamingLink,
} from "./types";

const ENDPOINT = "https://graphql.anilist.co";

export class SourceUnavailableError extends Error {
  constructor(public source: "anilist" | "jikan", message: string) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

const MEDIA_CORE = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  format
  status
  startDate { year month day }
  endDate { year month day }
  season
  seasonYear
  episodes
  duration
  genres
  averageScore
  popularity
`;

const MEDIA_FULL = `
  ${MEDIA_CORE}
  tags { id name rank isMediaSpoiler }
  studios(isMain: true) { nodes { id name } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
  rankings { rank type context season year allTime }
  streamingEpisodes { title url site }
  externalLinks { site url type }
  characters(sort: ROLE, perPage: 16) {
    edges {
      role
      node { id name { full } image { medium } }
      voiceActors(language: JAPANESE) { id name { full } image { medium } languageV2 }
    }
  }
  staff(perPage: 10) { edges { role node { id name { full } image { medium } } } }
  relations {
    edges {
      relationType
      node { id idMal type format title { romaji english } coverImage { large } }
    }
  }
  recommendations(perPage: 10, sort: RATING_DESC) {
    nodes { mediaRecommendation { id idMal title { romaji english } coverImage { large } } }
  }
`;

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new SourceUnavailableError("anilist", `Network error: ${String(err)}`);
  }
  if (res.status === 429) throw new SourceUnavailableError("anilist", "Rate limited by AniList");
  if (!res.ok) throw new SourceUnavailableError("anilist", `AniList responded ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length && json.data == null) {
    throw new SourceUnavailableError("anilist", json.errors[0].message);
  }
  if (json.data == null) throw new SourceUnavailableError("anilist", "Empty AniList response");
  return json.data;
}

/* ---------- mapping ---------- */

function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || null;
}

function fuzzyDate(d: any): string | null {
  if (!d?.year) return null;
  const m = String(d.month ?? 1).padStart(2, "0");
  const day = String(d.day ?? 1).padStart(2, "0");
  return `${d.year}-${m}-${day}`;
}

function title(t: any): string {
  return t?.romaji || t?.english || t?.native || "Untitled";
}

export function mapMedia(m: any): Anime {
  const tags: AnimeTag[] = (m.tags ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    rank: t.rank ?? null,
    spoiler: !!t.isMediaSpoiler,
  }));

  const studios: NamedRef[] = (m.studios?.nodes ?? []).map((s: any) => ({ id: s.id, name: s.name }));

  const characters: CharacterCredit[] = (m.characters?.edges ?? []).map((e: any) => ({
    id: e.node?.id,
    name: e.node?.name?.full ?? "Unknown",
    role: e.role ?? null,
    image: e.node?.image?.medium ?? null,
    voice_actors: (e.voiceActors ?? []).map((v: any) => ({
      id: v.id,
      name: v.name?.full ?? "Unknown",
      language: v.languageV2 ?? null,
      image: v.image?.medium ?? null,
    })),
  }));

  const staff: StaffCredit[] = (m.staff?.edges ?? []).map((e: any) => ({
    id: e.node?.id,
    name: e.node?.name?.full ?? "Unknown",
    role: e.role ?? null,
    image: e.node?.image?.medium ?? null,
  }));

  const relations: AnimeRelation[] = (m.relations?.edges ?? [])
    .filter((e: any) => e.node)
    .map((e: any) => ({
      relation: e.relationType ?? "RELATED",
      anilist_id: e.node.id,
      mal_id: e.node.idMal ?? null,
      title: title(e.node.title),
      format: e.node.format ?? null,
      type: e.node.type ?? "ANIME",
      cover: e.node.coverImage?.large ?? null,
    }));

  const recommendations: AnimeRecommendation[] = (m.recommendations?.nodes ?? [])
    .map((n: any) => n.mediaRecommendation)
    .filter(Boolean)
    .map((r: any) => ({
      anilist_id: r.id,
      mal_id: r.idMal ?? null,
      title: title(r.title),
      cover: r.coverImage?.large ?? null,
    }));

  const rankings: AnimeRanking[] = (m.rankings ?? []).map((r: any) => ({
    rank: r.rank,
    type: r.type,
    context: r.context,
    season: r.season ?? null,
    year: r.year ?? null,
    all_time: !!r.allTime,
  }));

  const streamingMap = new Map<string, StreamingLink>();
  for (const e of m.streamingEpisodes ?? []) {
    if (e?.site && e?.url && !streamingMap.has(e.site)) streamingMap.set(e.site, { site: e.site, url: e.url });
  }
  for (const l of m.externalLinks ?? []) {
    if (l?.type === "STREAMING" && l.site && l.url && !streamingMap.has(l.site)) {
      streamingMap.set(l.site, { site: l.site, url: l.url });
    }
  }

  return {
    internal_id: `al-${m.id}`,
    anilist_id: m.id,
    mal_id: m.idMal ?? null,
    titles: {
      romaji: m.title?.romaji ?? null,
      english: m.title?.english ?? null,
      native: m.title?.native ?? null,
    },
    description: stripHtml(m.description),
    images: {
      cover: m.coverImage?.extraLarge || m.coverImage?.large || "",
      banner: m.bannerImage ?? null,
    },
    format: m.format ?? null,
    status: m.status ?? null,
    dates: { start: fuzzyDate(m.startDate), end: fuzzyDate(m.endDate) },
    season: m.season ?? null,
    season_year: m.seasonYear ?? null,
    episodes: m.episodes ?? null,
    duration: m.duration ?? null,
    genres: Array.isArray(m.genres) ? m.genres : [],
    tags,
    studios,
    staff,
    characters,
    relations,
    recommendations,
    airing: m.nextAiringEpisode
      ? {
          next_episode: m.nextAiringEpisode.episode ?? null,
          airing_at: m.nextAiringEpisode.airingAt
            ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
            : null,
          seconds_until: m.nextAiringEpisode.timeUntilAiring ?? null,
        }
      : null,
    streaming: [...streamingMap.values()],
    anilist_score: typeof m.averageScore === "number" ? m.averageScore / 10 : null,
    popularity: m.popularity ?? null,
    rankings,
    mal: null,
    last_synced_at: new Date().toISOString(),
  };
}

/* ---------- operations ---------- */

export async function alSearch(query: string, perPage = 24): Promise<Anime[]> {
  const data = await gql<any>(
    `query($q:String,$perPage:Int){Page(perPage:$perPage){media(search:$q,type:ANIME,sort:SEARCH_MATCH,isAdult:false){${MEDIA_CORE}}}}`,
    { q: query, perPage },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}

export async function alTrending(perPage = 24): Promise<Anime[]> {
  const data = await gql<any>(
    `query($perPage:Int){Page(perPage:$perPage){media(type:ANIME,sort:SCORE_DESC,isAdult:false){${MEDIA_CORE}}}}`,
    { perPage },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}

function currentSeason(): { season: string; year: number } {
  const now = new Date();
  const m = now.getUTCMonth();
  const season = m < 3 ? "WINTER" : m < 6 ? "SPRING" : m < 9 ? "SUMMER" : "FALL";
  return { season, year: now.getUTCFullYear() };
}

export async function alSeasonNow(perPage = 24): Promise<Anime[]> {
  const { season, year } = currentSeason();
  const data = await gql<any>(
    `query($season:MediaSeason,$year:Int,$perPage:Int){Page(perPage:$perPage){media(season:$season,seasonYear:$year,type:ANIME,sort:POPULARITY_DESC,isAdult:false){${MEDIA_CORE}}}}`,
    { season, year, perPage },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}

export async function alByAnilistId(id: number): Promise<Anime | null> {
  const data = await gql<any>(`query($id:Int){Media(id:$id,type:ANIME){${MEDIA_FULL}}}`, { id });
  return data.Media ? mapMedia(data.Media) : null;
}

export async function alByMalId(idMal: number): Promise<Anime | null> {
  const data = await gql<any>(`query($idMal:Int){Media(idMal:$idMal,type:ANIME){${MEDIA_FULL}}}`, { idMal });
  return data.Media ? mapMedia(data.Media) : null;
}

/** Lightweight batch metadata for imported lists; no per-title request storm. */
export async function alByMalIds(ids: number[]): Promise<Anime[]> {
  const data = await gql<any>(
    `query($ids:[Int]){Page(perPage:50){media(idMal_in:$ids,type:ANIME){${MEDIA_CORE}}}}`,
    { ids },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}

function nextSeason(): { season: string; year: number } {
  const { season, year } = currentSeason();
  const order = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const i = order.indexOf(season);
  return i === 3 ? { season: "WINTER", year: year + 1 } : { season: order[i + 1], year };
}

export async function alNextSeason(perPage = 30): Promise<Anime[]> {
  const { season, year } = nextSeason();
  const data = await gql<any>(
    `query($season:MediaSeason,$year:Int,$perPage:Int){Page(perPage:$perPage){media(season:$season,seasonYear:$year,type:ANIME,sort:POPULARITY_DESC,isAdult:false){${MEDIA_CORE}}}}`,
    { season, year, perPage },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}

export async function alAnticipated(perPage = 30): Promise<Anime[]> {
  const data = await gql<any>(
    `query($perPage:Int){Page(perPage:$perPage){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC,isAdult:false){${MEDIA_CORE}}}}`,
    { perPage },
  );
  return (data.Page?.media ?? []).map(mapMedia);
}
