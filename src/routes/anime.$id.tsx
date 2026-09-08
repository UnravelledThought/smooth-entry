import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { getAnime } from "@/lib/anime-api";
import { useEntryFor, addEntry, deleteEntry, toggleFavorite } from "@/lib/local-store";
import { ArrowLeft, BookmarkCheck, Heart, Plus, Star } from "lucide-react";

export const Route = createFileRoute("/anime/$id")({
  head: () => ({
    meta: [
      { title: "Anime details — AniTrack" },
      { name: "description", content: "Score, episode count, genres and synopsis — add it to your list in one tap." },
      { property: "og:title", content: "Anime details — AniTrack" },
      { property: "og:description", content: "Score, episode count, genres and synopsis — add it to your list in one tap." },
    ],
  }),
  component: AnimeRoute,
});

function AnimeRoute() { return <Layout><AnimeDetail /></Layout>; }

function AnimeDetail() {
  const { id } = Route.useParams();
  const numId = Number(id);
  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", numId],
    queryFn: () => getAnime(numId),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const entry = useEntryFor(numId);

  if (isLoading) return <div className="mx-auto max-w-5xl px-5 py-12"><div className="h-96 animate-pulse rounded-xl border border-border bg-surface" /></div>;
  if (!anime) return <div className="mx-auto max-w-5xl px-5 py-12">Not found.</div>;

  return (
    <article>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[260px_1fr]">
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={anime.images.jpg.large_image_url} alt={anime.title} className="w-full" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {anime.type && <span className="rounded-full border border-border px-2.5 py-1">{anime.type}</span>}
              <span className="rounded-full border border-border px-2.5 py-1">{anime.status}</span>
              {anime.year && <span className="rounded-full border border-border px-2.5 py-1">{anime.year}</span>}
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
                  <Star className="h-5 w-5 accent-text fill-current" />
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
                  <span key={g.mal_id} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {entry ? (
                <>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-2.5 text-sm font-semibold"
                  >
                    <BookmarkCheck className="h-4 w-4" /> In your list
                  </button>
                  <button
                    onClick={() => toggleFavorite(entry.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                      entry.is_favorite ? "accent-bg" : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${entry.is_favorite ? "fill-current" : ""}`} />
                    {entry.is_favorite ? "Favorite" : "Favorite"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => addEntry(anime)}
                  className="accent-bg inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:gap-3"
                >
                  <Plus className="h-4 w-4" /> Add to list
                </button>
              )}
              <Link to="/list" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm">
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
