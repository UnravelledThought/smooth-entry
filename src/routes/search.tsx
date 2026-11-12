import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { searchFiltered, SEARCH_FORMATS, SEARCH_GENRES } from "@/lib/anime/service";
import { RefreshCw, Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search anime — AniTrack" },
      { name: "description", content: "Search thousands of anime titles and add them straight to your list." },
      { property: "og:title", content: "Search anime — AniTrack" },
      { property: "og:description", content: "Search thousands of anime titles and add them straight to your list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <Layout>
      <SearchInner />
    </Layout>
  );
}

function SearchInner() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const [genre, setGenre] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const hasFilter = !!genre || !!format;
  const enabled = debounced.trim().length > 1 || hasFilter;

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["anilist", "search", debounced, genre, format],
    queryFn: () => searchFiltered(debounced, { genre, format }),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const results = data?.data;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Search</h1>
      <p className="mt-2 text-muted-foreground">Search across thousands of anime titles.</p>

      <div className="relative mt-6 max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try 'frieren', 'cowboy bebop', 'jujutsu'…"
          className="w-full rounded-md border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="mt-5 space-y-2">
        <ChipRow label="Format" options={SEARCH_FORMATS.map((f) => [f, f === "MOVIE" ? "Movie" : f === "SPECIAL" ? "Special" : f])} value={format} onChange={setFormat} />
        <ChipRow label="Genre" options={SEARCH_GENRES.map((g) => [g, g])} value={genre} onChange={setGenre} />
        {hasFilter && (
          <button onClick={() => { setGenre(null); setFormat(null); }} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-10">
        {!enabled && (
          <p className="text-sm text-muted-foreground">Type at least 2 characters, or pick a filter to browse.</p>
        )}
        {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {isError && !isFetching && (
          <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted-foreground">
            Anime data is temporarily unavailable — try again in a moment.
            <button onClick={() => refetch()} className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-foreground hover:text-background">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {results && results.length === 0 && !isFetching && !isError && (
          <p className="text-sm text-muted-foreground">No results{debounced ? ` for "${debounced}"` : ""}.</p>
        )}
        {results && results.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((a) => <AnimeCard key={a.anilist_id} anime={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ChipRow({ label, options, value, onChange }: {
  label: string; options: [string, string][]; value: string | null; onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {options.map(([v, text]) => {
        const active = value === v;
        return (
          <button
            key={v}
            aria-pressed={active}
            onClick={() => onChange(active ? null : v)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              active ? "accent-border accent-text" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
