import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";

export function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link
      to="/anime/$id"
      params={{ id: routeIdFor(anime) }}
      className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:border-primary/50"
    >
      <div className="aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={anime.images.cover}
          alt={displayTitle(anime)}
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
          {anime.anilist_score != null && (
            <span className="flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-semibold text-primary-foreground">
              <Star className="h-3 w-3 fill-current" /> {anime.anilist_score.toFixed(1)}
            </span>
          )}
          {anime.season_year && (
            <span className="text-muted-foreground">{anime.season_year}</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
          {displayTitle(anime)}
        </h3>
      </div>
    </Link>
  );
}
