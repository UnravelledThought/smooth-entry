import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { getTopAnime, getSeasonNow } from "@/lib/anime-api";
import { useFavorites } from "@/lib/local-store";
import { ArrowRight, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AniTrack — Discover and track anime" },
      { name: "description", content: "Browse this season's anime and all-time favourites, then track what you watch." },
      { property: "og:title", content: "AniTrack — Discover and track anime" },
      { property: "og:description", content: "Browse this season's anime and all-time favourites, then track what you watch." },
    ],
  }),
  component: Home,
});

function Home() { return <Layout><Index /></Layout>; }

function Index() {
  const top = useQuery({ queryKey: ["top"], queryFn: getTopAnime, staleTime: 1000 * 60 * 60 * 24 });
  const season = useQuery({ queryKey: ["season"], queryFn: getSeasonNow, staleTime: 1000 * 60 * 60 * 24 });

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-24">
        <h1 className="font-display text-5xl font-semibold leading-[1] tracking-tight md:text-7xl">
          one list<br />
          <span className="text-muted-foreground">for all anime.</span>
        </h1>
        <div className="mt-10 flex flex-wrap gap-2">
          <Link to="/search" className="group inline-flex items-center gap-2 accent-bg rounded-full px-5 py-2 text-sm font-medium hover:gap-3 transition-all">
            Start tracking <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/list" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground">
            My list
          </Link>
        </div>
      </section>

      <FavoritesStrip />

      <Row title="Airing this season" loading={season.isLoading} items={season.data?.slice(0, 12)} />
      <Row title="All-time top" loading={top.isLoading} items={top.data?.slice(0, 12)} />
    </>
  );
}

function FavoritesStrip() {
  const favorites = useFavorites();
  if (favorites.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Heart className="h-3 w-3" /> Favorites
        </div>
        <h2 className="mt-1 font-display text-xl font-semibold">Your top picks</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {favorites.map((e) => (
          <div key={e.id} className="flex w-64 shrink-0 gap-3 rounded-xl border border-border bg-surface p-3">
            <Link to="/anime/$id" params={{ id: String(e.mal_id) }} className="shrink-0">
              <img src={e.image_url} alt="" className="h-24 w-16 rounded object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/anime/$id" params={{ id: String(e.mal_id) }} className="line-clamp-2 text-sm font-semibold leading-tight hover:accent-text">
                {e.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.progress}/{e.episodes ?? "?"} episodes
              </p>
              <p className="mt-1 text-xs">
                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{e.status}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ title, loading, items }: { title: string; loading: boolean; items: Awaited<ReturnType<typeof getTopAnime>> | undefined }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="mb-5 font-display text-xl font-semibold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items?.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
        </div>
      )}
    </section>
  );
}
