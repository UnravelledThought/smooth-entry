import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("keeps the Jikan request timeout at six seconds", async () => {
  vi.resetModules();
  const { jikanDetails } = await import("./jikan");
  const timeout = vi.spyOn(AbortSignal, "timeout");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { score: 8 } }))));
  await jikanDetails(1);
  expect(timeout).toHaveBeenCalledWith(6000);
});

it.each([undefined, 5_000])("defaults to 60 seconds and accepts a configured cooldown (%s)", async (configured) => {
  vi.resetModules();
  vi.useFakeTimers();
  const { configureJikan, DEFAULT_JIKAN_COOLDOWN_MS, jikanDetails } = await import("./jikan");
  expect(DEFAULT_JIKAN_COOLDOWN_MS).toBe(60_000);
  if (configured !== undefined) configureJikan({ cooldownMs: configured });
  const duration = configured ?? 60_000;
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(jikanDetails(1)).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(duration - 1);
  await expect(jikanDetails(1)).rejects.toThrow("unavailable");
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  fetcher.mockResolvedValue(new Response(JSON.stringify({ data: { score: 8.2 } })));
  expect(await jikanDetails(1)).toMatchObject({ score: 8.2 });
  expect(fetcher).toHaveBeenCalledTimes(2);
});