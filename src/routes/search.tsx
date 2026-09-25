import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { searchAnime } from "@/lib/anime/service";
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

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["anilist", "search", debounced],
    queryFn: () => searchAnime(debounced),
    enabled: debounced.trim().length > 1,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const results = data?.data;

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold">Find your next obsession</h1>
      <p className="mt-2 text-muted-foreground">Search across thousands of anime titles.</p>

      <div className="relative mt-8 max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try 'frieren', 'cowboy bebop', 'jujutsu'…"
          className="w-full rounded-full border border-border bg-card py-4 pl-14 pr-5 text-base outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div className="mt-10">
        {!debounced && (
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        )}
        {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {isError && !isFetching && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            Anime data is temporarily unavailable — try again in a moment.
            <button onClick={() => refetch()} className="ml-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-foreground hover:text-background">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {results && results.length === 0 && !isFetching && !isError && (
          <p className="text-sm text-muted-foreground">No results for "{debounced}".</p>
        )}
        {results && results.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((a) => <AnimeCard key={a.anilist_id} anime={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
