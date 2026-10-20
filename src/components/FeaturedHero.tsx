import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Heart, Plus } from "lucide-react";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";
import { addEntry, toggleFavorite, useEntryForAnime } from "@/lib/local-store";

const STATUS_LABEL: Record<string, string> = {
  RELEASING: "Airing",
  NOT_YET_RELEASED: "Upcoming",
  FINISHED: "Finished",
  HIATUS: "On hiatus",
  CANCELLED: "Cancelled",
};

function formatLabel(f: string | null) {
  if (!f) return null;
  return f === "TV_SHORT" ? "TV Short" : f.length <= 3 ? f : f[0] + f.slice(1).toLowerCase();
}

function plain(text: string | null) {
  return (text ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function FeaturedHero({ items, loading }: { items: Anime[]; loading: boolean }) {
  const slides = items.filter((a) => a.images.banner).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  if (loading) return <div className="mx-auto mt-6 h-[360px] max-w-6xl rounded-md bg-surface md:h-[460px]" style={{ width: "calc(100% - 2.5rem)" }} />;
  if (count === 0) return null;

  const current = slides[Math.min(index, count - 1)];
  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section className="mx-auto max-w-6xl px-5 pt-6">
      <div
        className="relative h-[360px] overflow-hidden rounded-md border border-border bg-surface md:h-[460px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((a, i) => (
          <img
            key={a.internal_id}
            src={a.images.banner!}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <Slide anime={current} />

        {count > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground backdrop-blur hover:text-foreground md:grid">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground backdrop-blur hover:text-foreground md:grid">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 right-5 flex gap-1.5">
              {slides.map((a, i) => (
                <button
                  key={a.internal_id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${displayTitle(a)}`}
                  className={`h-1 rounded-full transition-all ${i === index ? "w-6 accent-bg" : "w-3 bg-foreground/30 hover:bg-foreground/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Slide({ anime }: { anime: Anime }) {
  const entry = useEntryForAnime(anime);
  const status = anime.status ? STATUS_LABEL[anime.status] : null;
  const format = formatLabel(anime.format);
  const meta = [format, anime.season && anime.season_year ? `${anime.season[0]}${anime.season.slice(1).toLowerCase()} ${anime.season_year}` : anime.season_year, anime.episodes ? `${anime.episodes} eps` : null].filter(Boolean);
  const desc = plain(anime.description);

  return (
    <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-end p-6 md:justify-center md:p-14">
      <div className="flex gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {status && <span className="accent-bg rounded-md px-2 py-1">{status}</span>}
        {format && <span className="rounded-md border border-foreground/30 px-2 py-1">{format}</span>}
      </div>
      <h2 className="mt-3 line-clamp-2 font-display text-3xl font-semibold leading-tight md:text-5xl">{displayTitle(anime)}</h2>
      {meta.length > 0 && <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">{meta.join(" · ")}</p>}
      {anime.genres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {anime.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-md border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">{g}</span>
          ))}
        </div>
      )}
      {desc && <p className="mt-3 hidden line-clamp-2 text-sm text-foreground/80 md:block">{desc}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link to="/anime/$id" params={{ id: routeIdFor(anime) }} className="accent-bg inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all hover:gap-3">
          View details <ArrowRight className="h-4 w-4" />
        </Link>
        {entry ? (
          <Link to="/list" className="inline-flex items-center gap-2 rounded-md border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            <Check className="h-4 w-4" /> In list
          </Link>
        ) : (
          <button onClick={() => addEntry(anime)} className="inline-flex items-center gap-2 rounded-md border border-border bg-background/50 px-4 py-2 text-sm hover:bg-foreground hover:text-background">
            <Plus className="h-4 w-4" /> Add to list
          </button>
        )}
        <button
          onClick={() => entry && toggleFavorite(entry.id)}
          disabled={!entry}
          title={entry ? "Favorite" : "Add to list first"}
          aria-label="Favorite"
          className={`grid h-9 w-9 place-items-center rounded-md border disabled:opacity-40 ${entry?.is_favorite ? "accent-bg accent-border" : "border-border bg-background/50 hover:text-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${entry?.is_favorite ? "fill-current" : ""}`} />
        </button>
      </div>
    </div>
  );
}
