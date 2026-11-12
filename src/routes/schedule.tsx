import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getWeeklySchedule, weekStart, displayTitle, routeIdFor, type AiringSlot } from "@/lib/anime/service";
import { useEntries } from "@/lib/local-store";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Weekly airing schedule — AniTrack" },
      { name: "description", content: "See which anime episodes air each day this week, in your local time." },
      { property: "og:title", content: "Weekly airing schedule — AniTrack" },
      { property: "og:description", content: "See which anime episodes air each day this week, in your local time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SchedulePage() {
  return <Layout><ScheduleInner /></Layout>;
}

function countdown(sec: number, now: number) {
  const d = sec - now;
  if (d <= 0) return "Aired";
  const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60);
  if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  return h ? `in ${h}h ${m}m` : `in ${m}m`;
}

function ScheduleInner() {
  const [now, setNow] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [mine, setMine] = useState(false);
  const entries = useEntries();

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    setDay((new Date().getDay() + 6) % 7);
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["anilist", "schedule", weekStart().getTime()],
    queryFn: () => getWeeklySchedule(),
    enabled: now != null,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const watching = useMemo(() => {
    const al = new Set<number>(), mal = new Set<number>();
    for (const e of entries) if (e.status === "watching") {
      if (e.anilist_id != null) al.add(e.anilist_id);
      if (e.mal_id != null) mal.add(e.mal_id);
    }
    return (a: AiringSlot["anime"]) => al.has(a.anilist_id) || (a.mal_id != null && mal.has(a.mal_id));
  }, [entries]);

  const byDay = useMemo(() => {
    const g: AiringSlot[][] = DAYS.map(() => []);
    for (const s of data?.data ?? []) g[(new Date(s.airingAt * 1000).getDay() + 6) % 7].push(s);
    return g;
  }, [data]);

  const today = now != null ? (new Date(now * 1000).getDay() + 6) % 7 : -1;
  const slots = day == null ? [] : byDay[day];
  const shown = mine ? slots.filter((s) => watching(s.anime)) : slots;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Schedule</h1>
      <p className="mt-2 text-muted-foreground">Episodes airing this week, in your local time.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setDay(i)}
              className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                day === i ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
              <span className="ml-1.5 text-[10px] opacity-60">{byDay[i].length || ""}</span>
              {today === i && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full accent-bg" />}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          {[["All", false], ["My watching", true]].map(([l, v]) => (
            <button
              key={String(l)}
              onClick={() => setMine(v as boolean)}
              className={`rounded px-3 py-1 ${mine === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l as string}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {(isLoading || now == null) && (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-md bg-surface" />)}</div>
        )}
        {isError && (
          <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted-foreground">
            The schedule is temporarily unavailable.
            <button onClick={() => refetch()} className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-foreground hover:text-background">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {data && now != null && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">{mine ? "Nothing from your Watching list airs this day." : "Nothing airs this day."}</p>
        )}
        {data && now != null && shown.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((s) => {
              const own = watching(s.anime);
              const aired = s.airingAt <= now;
              return (
                <li key={`${s.anime.anilist_id}-${s.episode}`}>
                  <Link
                    to="/anime/$id"
                    params={{ id: routeIdFor(s.anime) }}
                    className={`flex items-center gap-3 rounded-md border bg-surface p-2.5 transition-colors hover:border-foreground/40 ${own ? "accent-border" : "border-border"} ${aired ? "opacity-60" : ""}`}
                  >
                    <img src={s.anime.images.cover} alt="" loading="lazy" className="h-16 w-11 shrink-0 rounded-sm object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayTitle(s.anime)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ep {s.episode}{s.anime.episodes ? ` / ${s.anime.episodes}` : ""}{s.anime.format ? ` · ${s.anime.format}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums">{new Date(s.airingAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className={`text-[11px] ${own && !aired ? "accent-text" : "text-muted-foreground"}`}>{countdown(s.airingAt, now)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
