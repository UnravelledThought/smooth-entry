import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Anime } from "@/lib/anime-api";

export function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link
      to="/anime/$id"
      params={{ id: String(anime.mal_id) }}
      className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:border-primary/50"
    >
      <div className="aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={anime.images.jpg.large_image_url}
          alt={anime.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-card)" }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs">
          {anime.score && (
            <span className="flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-semibold text-primary-foreground">
              <Star className="h-3 w-3 fill-current" /> {anime.score.toFixed(1)}
            </span>
          )}
          {anime.year && (
            <span className="text-muted-foreground">{anime.year}</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
          {anime.title_english ?? anime.title}
        </h3>
      </div>
    </Link>
  );
}
