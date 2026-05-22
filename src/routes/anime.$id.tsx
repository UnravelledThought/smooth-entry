import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { getAnime } from "@/lib/anime-api";
import { addToList, isInList, removeFromList, useWatchlist } from "@/lib/watchlist";
import { ArrowLeft, BookmarkCheck, Plus, Star } from "lucide-react";

export const Route = createFileRoute("/anime/$id")({
  component: () => (
    <Layout>
      <AnimeDetail />
    </Layout>
  ),
});

function AnimeDetail() {
  const { id } = Route.useParams();
  const numId = Number(id);
  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", numId],
    queryFn: () => getAnime(numId),
  });
  const list = useWatchlist();
  const inList = list.some((e) => e.id === numId) || isInList(numId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="h-96 animate-pulse rounded-3xl bg-card" />
      </div>
    );
  }
  if (!anime) {
    return <div className="mx-auto max-w-5xl px-5 py-12">Not found.</div>;
  }

  return (
    <article className="relative">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[400px] overflow-hidden opacity-30"
      >
        <img src={anime.images.jpg.large_image_url} alt="" className="h-full w-full object-cover blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[260px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border/60" style={{ boxShadow: "var(--shadow-glow)" }}>
            <img src={anime.images.jpg.large_image_url} alt={anime.title} className="w-full" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {anime.type && <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary">{anime.type}</span>}
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{anime.status}</span>
              {anime.year && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{anime.year}</span>}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              {anime.title_english ?? anime.title}
            </h1>
            {anime.title_english && anime.title_english !== anime.title && (
              <p className="mt-1 text-sm text-muted-foreground">{anime.title}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-5">
              {anime.score && (
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  <span className="text-xl font-bold">{anime.score.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{anime.episodes ?? "?"}</span> episodes
              </div>
            </div>

            {anime.genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {anime.genres.map((g) => (
                  <span key={g.mal_id} className="rounded-full border border-border px-3 py-1 text-xs">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {inList ? (
                <button
                  onClick={() => removeFromList(numId)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-sm font-semibold text-primary"
                >
                  <BookmarkCheck className="h-4 w-4" /> In your list
                </button>
              ) : (
                <button
                  onClick={() => addToList(anime, "plan")}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:gap-3"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  <Plus className="h-4 w-4" /> Add to list
                </button>
              )}
              <Link
                to="/list"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"
              >
                View my list
              </Link>
            </div>

            {anime.synopsis && (
              <p className="mt-8 leading-relaxed text-muted-foreground">{anime.synopsis}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
