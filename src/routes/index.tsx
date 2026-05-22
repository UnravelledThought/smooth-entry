import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { AnimeCard } from "@/components/AnimeCard";
import { getTopAnime, getSeasonNow } from "@/lib/anime-api";
import { ArrowRight, Flame, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <Layout>
      <Index />
    </Layout>
  );
}

function Index() {
  const top = useQuery({ queryKey: ["top"], queryFn: getTopAnime });
  const season = useQuery({ queryKey: ["season"], queryFn: getSeasonNow });
  const hero = top.data?.[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Tracking <span className="text-primary font-semibold">2.4M+</span> anime fans this season
              </div>
              <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
                Every series.<br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Every episode.
                </span><br />
                One list.
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                Build a watchlist, track progress per episode, and discover what's airing this season — no account required.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/search"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:gap-3"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  Start tracking
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/list"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-semibold backdrop-blur transition-all hover:bg-card"
                >
                  My list
                </Link>
              </div>
            </div>

            {hero && (
              <Link
                to="/anime/$id"
                params={{ id: String(hero.mal_id) }}
                className="group relative block aspect-[3/4] overflow-hidden rounded-3xl border border-border/60"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                <img
                  src={hero.images.jpg.large_image_url}
                  alt={hero.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    <Flame className="h-3 w-3" /> #1 All-time
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight">
                    {hero.title_english ?? hero.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ★ {hero.score?.toFixed(2)} · {hero.episodes ?? "?"} eps · {hero.year ?? hero.status}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* This season */}
      <Section
        title="Airing this season"
        icon={<TrendingUp className="h-5 w-5" />}
        loading={season.isLoading}
        items={season.data?.slice(0, 12)}
      />

      {/* Top */}
      <Section
        title="All-time top rated"
        icon={<Flame className="h-5 w-5" />}
        loading={top.isLoading}
        items={top.data?.slice(1, 13)}
      />
    </>
  );
}

function Section({
  title,
  icon,
  loading,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  items: Awaited<ReturnType<typeof getTopAnime>> | undefined;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </span>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items?.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
        </div>
      )}
    </section>
  );
}
