import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { getTopAnime, getSeasonNow } from "@/lib/anime-api";
import { useSharedFeed } from "@/lib/cloud-watchlist";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Share2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() { return <Layout><Index /></Layout>; }

function Index() {
  const top = useQuery({ queryKey: ["top"], queryFn: getTopAnime });
  const season = useQuery({ queryKey: ["season"], queryFn: getSeasonNow });
  const { user } = useAuth();

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-24">
        <h1 className="font-display text-5xl font-semibold leading-[1] tracking-tight md:text-7xl">
          one list<br />
          <span className="text-muted-foreground">for all anime.</span>
        </h1>
        <div className="mt-10 flex flex-wrap gap-2">
          <Link to={user ? "/search" : "/auth"} className="group inline-flex items-center gap-2 accent-bg rounded-full px-5 py-2 text-sm font-medium hover:gap-3 transition-all">
            {user ? "Start tracking" : "Sign in to track"} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to={user ? "/list" : "/auth"} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground">
            {user ? "My list" : "Create account"}
          </Link>
        </div>
      </section>

      <SharedFeed />

      <Row title="Airing this season" loading={season.isLoading} items={season.data?.slice(0, 12)} />
      <Row title="All-time top" loading={top.isLoading} items={top.data?.slice(0, 12)} />
    </>
  );
}

function SharedFeed() {
  const feed = useSharedFeed(12);
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Share2 className="h-3 w-3" /> Shared
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold">Recently shared</h2>
        </div>
      </div>
      {feed.isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 w-56 shrink-0 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : feed.data && feed.data.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {feed.data.map((e) => (
            <div key={e.id} className="flex w-64 shrink-0 gap-3 rounded-xl border border-border bg-surface p-3">
              <Link to="/anime/$id" params={{ id: String(e.mal_id) }} className="shrink-0">
                <img src={e.image_url} alt="" className="h-24 w-16 rounded object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to="/anime/$id" params={{ id: String(e.mal_id) }} className="line-clamp-2 text-sm font-semibold leading-tight hover:accent-text">
                  {e.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  shared by{" "}
                  {e.profile?.username ? (
                    <Link to="/u/$username" params={{ username: e.profile.username }} className="hover:accent-text">
                      @{e.profile.username}
                    </Link>
                  ) : "someone"}
                </p>
                <p className="mt-1 text-xs"><span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{e.status}</span></p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No shares yet — be the first to share something from your list.
        </div>
      )}
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
