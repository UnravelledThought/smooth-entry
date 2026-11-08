import { describe, expect, it } from "vitest";
import { clampProgress, clampScore, cleanStatus, dedupeAnime } from "./entry-rules";

describe("entry rules", () => {
  it("caps progress at the episode count and floors at 0", () => {
    expect(clampProgress(30, 24)).toBe(24);
    expect(clampProgress(-3, 24)).toBe(0);
    expect(clampProgress(500, null)).toBe(500);
  });
  it("keeps personal scores within 0–10.0", () => {
    expect(clampScore(12)).toBe(10);
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(7.46)).toBe(7.5);
    expect(clampScore("abc")).toBeNull();
  });
  it("keeps On-Hold as its own status and rejects unknown ones", () => {
    expect(cleanStatus("onhold")).toBe("onhold");
    expect(cleanStatus("bogus")).toBe("plan");
  });
  it("treats AniList-only duplicates as the same anime", () => {
    const rows = [
      { mal_id: null, anilist_id: 5 },
      { mal_id: null, anilist_id: 5 },
      { mal_id: 9, anilist_id: null },
    ];
    expect(dedupeAnime(rows, [{ mal_id: 9, anilist_id: 1 }])).toEqual([{ mal_id: null, anilist_id: 5 }]);
  });
});
