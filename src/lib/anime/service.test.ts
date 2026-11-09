import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheRead, cacheWrite } from "./cache";
import { alByAnilistId, alSearch } from "./anilist";
import { jikanDetails, jikanEpisodes } from "./jikan";
import { getAnime, getEpisodes, getMalDetails, searchAnime } from "./service";

vi.mock("./anilist", () => ({
  SourceUnavailableError: class extends Error {},
  alByAnilistId: vi.fn(), alByMalId: vi.fn(), alByMalIds: vi.fn(),
  alSearch: vi.fn(), alSeasonNow: vi.fn(), alTrending: vi.fn(),
  alNextSeason: vi.fn(), alAnticipated: vi.fn(),
}));
vi.mock("./jikan", () => ({
  jikanDetails: vi.fn(), jikanEpisodes: vi.fn(), configureJikan: vi.fn(),
  DEFAULT_JIKAN_COOLDOWN_MS: 60_000,
}));

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  } });
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

describe("accepted anime source requirements", () => {
  it("keeps search AniList-first without requesting MAL enrichment", async () => {
    vi.mocked(alSearch).mockResolvedValue([]);
    await searchAnime("Frieren");
    expect(alSearch).toHaveBeenCalledWith("Frieren");
    expect(jikanDetails).not.toHaveBeenCalled();
  });
  it("never substitutes an AniList score for an unavailable MAL rating", async () => {
    vi.mocked(jikanDetails).mockRejectedValue(new Error("outage"));
    expect(await getMalDetails(1)).toMatchObject({ data: null, status: "unavailable" });
    expect(alByAnilistId).not.toHaveBeenCalled();
  });
  it("supports AniList-only entries without making MAL requests", async () => {
    vi.mocked(alByAnilistId).mockResolvedValue(null);
    await getAnime("al999");
    expect(alByAnilistId).toHaveBeenCalledWith(999);
    expect(await getMalDetails(null)).toMatchObject({ data: null, status: "ok" });
    expect(await getEpisodes({ internal_id: "al-999", mal_id: null })).toMatchObject({ data: [] });
    expect(jikanDetails).not.toHaveBeenCalled();
    expect(jikanEpisodes).not.toHaveBeenCalled();
  });
  it.each([false, true])("retains cached MAL ratings during outages (force=%s)", async (force) => {
    const rating = { mal_id: 1, score: 8.7, rank: 12, popularity: 10, members: 1000, last_synced_at: "2020-01-01T00:00:00.000Z" };
    cacheWrite("mal:1", rating);
    const stored = cacheRead("mal:1");
    vi.mocked(jikanDetails).mockRejectedValue(new Error("outage"));
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 4 * 24 * 60 * 60 * 1000);
    expect(await getMalDetails(1, { force })).toMatchObject({ data: rating, stale: true, status: "ok" });
    expect(cacheRead("mal:1")).toEqual(stored);
    vi.restoreAllMocks();
  });
  it.each([false, true])("retains cached MAL episodes during outages (force=%s)", async (force) => {
    const episodes = [{ internal_id: "al-1-ep1", anime_id: "al-1", mal_episode_id: 1, episode_number: 1, title: "Pilot", title_japanese: null, air_date: null, score: 8, filler: false, recap: false }];
    cacheWrite("episodes:1", episodes);
    const stored = cacheRead("episodes:1");
    vi.mocked(jikanEpisodes).mockRejectedValue(new Error("outage"));
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 4 * 24 * 60 * 60 * 1000);
    expect(await getEpisodes({ internal_id: "al-1", mal_id: 1 }, { force })).toMatchObject({ data: episodes, stale: true, status: "ok" });
    expect(cacheRead("episodes:1")).toEqual(stored);
    vi.restoreAllMocks();
  });
});