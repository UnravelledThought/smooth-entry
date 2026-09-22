/**
 * Internal, normalized anime model.
 *
 * The rest of the app consumes only these types — never raw AniList or Jikan
 * shapes. AniList owns the main entity; MyAnimeList (via Jikan) owns the `mal`
 * block and episodes. Neither source may overwrite the other's fields.
 */

export interface AnimeTitles {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AnimeImages {
  cover: string;
  banner: string | null;
}

export interface NamedRef {
  id: number;
  name: string;
}

export interface AnimeTag extends NamedRef {
  rank: number | null;
  spoiler: boolean;
}

export interface StaffCredit {
  id: number;
  name: string;
  role: string | null;
  image: string | null;
}

export interface VoiceActor {
  id: number;
  name: string;
  language: string | null;
  image: string | null;
}

export interface CharacterCredit {
  id: number;
  name: string;
  role: string | null;
  image: string | null;
  voice_actors: VoiceActor[];
}

export interface AnimeRelation {
  relation: string;
  anilist_id: number;
  mal_id: number | null;
  title: string;
  format: string | null;
  type: "ANIME" | "MANGA" | string;
  cover: string | null;
}

export interface AnimeRecommendation {
  anilist_id: number;
  mal_id: number | null;
  title: string;
  cover: string | null;
}

export interface AiringInfo {
  next_episode: number | null;
  airing_at: string | null;
  seconds_until: number | null;
}

export interface StreamingLink {
  site: string;
  url: string;
}

export interface AnimeRanking {
  rank: number;
  type: string;
  context: string;
  season: string | null;
  year: number | null;
  all_time: boolean;
}

/** MyAnimeList-owned numbers. Kept separate from AniList's own score. */
export interface MalDetails {
  mal_id: number;
  score: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  last_synced_at: string;
}

export interface Anime {
  internal_id: string;
  anilist_id: number;
  mal_id: number | null;
  titles: AnimeTitles;
  description: string | null;
  images: AnimeImages;
  format: string | null;
  status: string | null;
  dates: { start: string | null; end: string | null };
  season: string | null;
  season_year: number | null;
  episodes: number | null;
  duration: number | null;
  genres: string[];
  tags: AnimeTag[];
  studios: NamedRef[];
  staff: StaffCredit[];
  characters: CharacterCredit[];
  relations: AnimeRelation[];
  recommendations: AnimeRecommendation[];
  airing: AiringInfo | null;
  streaming: StreamingLink[];
  anilist_score: number | null;
  popularity: number | null;
  rankings: AnimeRanking[];
  /** Never written by the AniList mapper. Filled only from Jikan. */
  mal: MalDetails | null;
  last_synced_at: string;
}

export interface Episode {
  internal_id: string;
  anime_id: string;
  mal_episode_id: number | null;
  episode_number: number;
  title: string | null;
  title_japanese: string | null;
  air_date: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
}

/** Display title preference: English, then romaji, then native. */
export function displayTitle(a: Pick<Anime, "titles">): string {
  return a.titles.english || a.titles.romaji || a.titles.native || "Untitled";
}

/** Route id used by /anime/$id — MAL id when known, else `al<anilistId>`. */
export function routeIdFor(a: Pick<Anime, "mal_id" | "anilist_id">): string {
  return a.mal_id != null ? String(a.mal_id) : `al${a.anilist_id}`;
}

export type SourceStatus = "ok" | "unavailable";

export interface SourceResult<T> {
  data: T;
  status: SourceStatus;
  stale: boolean;
  last_synced_at: string | null;
}
