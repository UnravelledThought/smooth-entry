import { Link } from "@tanstack/react-router";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";
import { useQuery } from "@tanstack/react-query";
import { getMalDetails } from "@/lib/anime/service";
import { Star } from "lucide-react";

export function AnimeCard({ anime, ratingSource = "anilist" }: { anime: Anime; ratingSource?: "mal" | "anilist" }) {
  const mal = useQuery({
    queryKey: ["mal", anime.mal_id],
    queryFn: () => getMalDetails(anime.mal_id),
    enabled: ratingSource === "mal" && anime.mal_id != null,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const score = ratingSource === "mal" ? mal.data?.data?.score ?? anime.mal?.score : anime.anilist_score;
  return (
    <Link to="/anime/$id" params={{ id: routeIdFor(anime) }} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface">
        <img
          src={anime.images.cover}
          alt={displayTitle(anime)}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
      </div>
      <h3 className="mt-2 line-clamp-2 font-sans text-[13px] font-medium leading-snug tracking-normal group-hover:accent-text">
        {displayTitle(anime)}
      </h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {anime.season_year && <span>{anime.season_year}</span>}
        <span className="inline-flex items-center gap-1" title={`${ratingSource === "mal" ? "MyAnimeList" : "AniList"} rating`}>
          <Star className="h-3 w-3" />
          {score != null ? score.toFixed(1) : "—"}
          <span>{ratingSource === "mal" ? "MAL" : "AL"}</span>
        </span>
      </div>
    </Link>
  );
}
