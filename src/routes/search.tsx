import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { searchAnime } from "@/lib/anime-api";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  component: () => (
    <Layout>
      <SearchPage />
    </Layout>
  ),
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  // simple debounce
  useState(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  });

  // re-debounce when q changes
  if (typeof window !== "undefined") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebouncedEffect(() => setDebounced(q), [q], 350);
  }

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAnime(debounced),
    enabled: debounced.trim().length > 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold">Find your next obsession</h1>
      <p className="mt-2 text-muted-foreground">Search across 25,000+ anime titles.</p>

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
        {data && data.length === 0 && !isFetching && (
          <p className="text-sm text-muted-foreground">No results for "{debounced}".</p>
        )}
        {data && data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
function useDebouncedEffect(fn: () => void, deps: React.DependencyList, ms: number) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
