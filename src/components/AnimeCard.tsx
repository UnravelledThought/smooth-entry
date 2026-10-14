import { Link } from "@tanstack/react-router";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";

export function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link to="/anime/$id" params={{ id: routeIdFor(anime) }} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface">
        <img
          src={anime.images.cover}
          alt={displayTitle(anime)}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
        {anime.anilist_score != null && (
          <span className="absolute left-1.5 top-1.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] tabular-nums backdrop-blur">
            {anime.anilist_score.toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 font-sans text-[13px] font-medium leading-snug tracking-normal group-hover:accent-text">
        {displayTitle(anime)}
      </h3>
      {anime.season_year && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{anime.season_year}</p>
      )}
    </Link>
  );
}
