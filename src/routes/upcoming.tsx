import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getAnticipated, getNextSeason } from "@/lib/anime/service";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";
import { addEntry, useEntries, useEntryForAnime } from "@/lib/local-store";

export const Route = createFileRoute("/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming releases — AniTrack" },
      { name: "description", content: "Next season's premieres and the most anticipated upcoming anime." },
      { property: "og:title", content: "Upcoming releases — AniTrack" },
      { property: "og:description", content: "Next season's premieres and the most anticipated upcoming anime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpcomingPage,
});

type View = "next" | "anticipated" | "mine";
const VIEWS: { id: View; label: string }[] = [
  { id: "next", label: "Next season" },
  { id: "anticipated", label: "Most anticipated" },
  { id: "mine", label: "In my list" },
];

function UpcomingPage() {
  return (
    <Layout>
      <UpcomingInner />
    </Layout>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function releaseLabel(a: Anime): string {
  const d = a.dates.start;
  if (d) {
    const [y, m, day] = d.split("-").map(Number);
    // fuzzyDate pads unknown month/day to 01; only show a precise date when the season is not the only info
    if (a.season && day === 1) return `${cap(a.season)} ${a.season_year ?? y}`;
    return `${MONTHS[m - 1]} ${day}, ${y}`;
  }
  if (a.season && a.season_year) return `${cap(a.season)} ${a.season_year}`;
  if (a.season_year) return String(a.season_year);
  return "TBA";
}

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function UpcomingInner() {
  const [view, setView] = useState<View>("next");
  const entries = useEntries();
  const next = useQuery({ queryKey: ["anilist", "next-season"], queryFn: getNextSeason, staleTime: 1000 * 60 * 60, retry: 1 });
  const ant = useQuery({ queryKey: ["anilist", "anticipated"], queryFn: getAnticipated, staleTime: 1000 * 60 * 60, retry: 1, enabled: view !== "next" });

  const items = useMemo(() => {
    if (view === "next") return next.data?.data ?? [];
    if (view === "anticipated") return ant.data?.data ?? [];
    const seen = new Set<number>();
    return [...(next.data?.data ?? []), ...(ant.data?.data ?? [])].filter((a) => {
      if (seen.has(a.anilist_id)) return false;
      seen.add(a.anilist_id);
      return entries.some((e) => e.anilist_id === a.anilist_id || (a.mal_id != null && e.mal_id === a.mal_id));
    });
  }, [view, next.data, ant.data, entries]);

  const q = view === "next" ? next : ant;
  const loading = view === "mine" ? next.isLoading || ant.isLoading : q.isLoading;
  const error = view === "mine" ? next.isError && ant.isError : q.isError;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Upcoming</h1>
      <p className="mt-2 text-muted-foreground">Premieres on the way. Add them to your plan to watch.</p>

      <div className="mt-6 flex flex-wrap gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              view === v.id ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && !loading && (
          <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted-foreground">
            Anime data is temporarily unavailable.
            <button
              onClick={() => { next.refetch(); ant.refetch(); }}
              className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-foreground hover:text-background"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {view === "mine" ? "None of the upcoming titles are on your list yet." : "Nothing announced yet."}
          </p>
        )}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((a) => <UpcomingCard key={a.anilist_id} anime={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingCard({ anime }: { anime: Anime }) {
  const entry = useEntryForAnime(anime);
  const studio = anime.studios[0]?.name;
  return (
    <div className="flex flex-col">
      <Link to="/anime/$id" params={{ id: routeIdFor(anime) }} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface">
          {anime.images.cover && <img src={anime.images.cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
          <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {releaseLabel(anime)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:accent-text">
          {displayTitle(anime)}
        </p>
      </Link>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {[anime.format?.replace("_", " "), studio].filter(Boolean).join(" · ") || "—"}
      </p>
      <button
        onClick={() => !entry && addEntry(anime, "plan")}
        disabled={!!entry}
        className={`mt-2 inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
          entry ? "accent-border accent-text cursor-default" : "border-border text-muted-foreground hover:bg-foreground hover:text-background"
        }`}
      >
        {entry ? <><Check className="h-3 w-3" /> In list</> : <><Plus className="h-3 w-3" /> Plan to watch</>}
      </button>
    </div>
  );
}
