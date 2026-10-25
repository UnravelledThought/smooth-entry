import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAnime, getEpisodes, getMalDetails, refreshAnime } from "@/lib/anime/service";
import { displayTitle, routeIdFor, type Anime } from "@/lib/anime/types";
import { useEntryForAnime, addEntry, deleteEntry, toggleFavorite } from "@/lib/local-store";
import { ArrowLeft, BookmarkCheck, Heart, Plus, RefreshCw, Star } from "lucide-react";

export const Route = createFileRoute("/anime/$id")({
  head: () => ({
    meta: [
      { title: "Anime details — AniTrack" },
      { name: "description", content: "Scores, episodes, characters, studios and related shows — add it to your list in one tap." },
      { property: "og:title", content: "Anime details — AniTrack" },
      { property: "og:description", content: "Scores, episodes, characters, studios and related shows — add it to your list in one tap." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnimeRoute,
});

function AnimeRoute() { return <Layout><AnimeDetail /></Layout>; }

function pretty(s: string | null | undefined) {
  if (!s) return null;
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function syncedLabel(iso: string | null) {
  if (!iso) return "not synced yet";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "synced just now";
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  return `synced ${Math.round(hrs / 24)}d ago`;
}

function AnimeDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const meta = useQuery({
    queryKey: ["anime", id],
    queryFn: () => getAnime(id),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  const anime = meta.data?.data ?? null;
  const entry = useEntryForAnime(anime);

  const mal = useQuery({
    queryKey: ["mal", anime?.mal_id],
    queryFn: () => getMalDetails(anime!.mal_id),
    enabled: !!anime?.mal_id,
    staleTime: 1000 * 60 * 60,
    retry: 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnime(id);
      await qc.invalidateQueries({ queryKey: ["anime", id] });
      await qc.invalidateQueries({ queryKey: ["mal", anime?.mal_id] });
      await qc.invalidateQueries({ queryKey: ["episodes", anime?.mal_id] });
    } finally {
      setRefreshing(false);
    }
  };

  if (meta.isLoading) {
    return <div className="mx-auto max-w-5xl px-5 py-12"><div className="h-96 animate-pulse rounded-md border border-border bg-surface" /></div>;
  }
  if (meta.isError) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-sm text-muted-foreground">
        Anime data is temporarily unavailable.
        <button onClick={() => meta.refetch()} className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-foreground hover:text-background">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  if (!anime) return <div className="mx-auto max-w-5xl px-5 py-12">Not found.</div>;

  const malData = mal.data?.data ?? null;
  const malUnavailable = mal.data?.status === "unavailable";

  return (
    <article>
      {anime.images.banner && (
        <div className="relative h-48 w-full overflow-hidden md:h-64">
          <img src={anime.images.banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : `Refresh · ${syncedLabel(meta.data?.last_synced_at ?? null)}`}
          </button>
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border border-border">
              <img src={anime.images.cover} alt={displayTitle(anime)} className="w-full" />
            </div>
            {anime.streaming.length > 0 && (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Watch on</p>
                <div className="flex flex-wrap gap-1.5">
                  {anime.streaming.map((s) => (
                    <a key={s.site} href={s.url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1 text-xs hover:accent-text">
                      {s.site}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {anime.format && <span className="rounded-md border border-border px-2.5 py-1">{pretty(anime.format)}</span>}
              {anime.status && <span className="rounded-md border border-border px-2.5 py-1">{pretty(anime.status)}</span>}
              {anime.season && anime.season_year && (
                <span className="rounded-md border border-border px-2.5 py-1">{pretty(anime.season)} {anime.season_year}</span>
              )}
              {anime.duration && <span className="rounded-md border border-border px-2.5 py-1">{anime.duration} min</span>}
            </div>

            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">{displayTitle(anime)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[anime.titles.romaji, anime.titles.native].filter(Boolean).join(" · ")}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AniList</p>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 accent-text fill-current" />
                  <span className="text-xl font-bold">{anime.anilist_score?.toFixed(1) ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">MyAnimeList</p>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4" />
                  <span className="text-xl font-bold">
                    {mal.isFetching ? "…" : malUnavailable ? "n/a" : (malData?.score?.toFixed(2) ?? "—")}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{anime.episodes ?? "?"}</span> episodes
              </div>
            </div>

            {anime.airing?.next_episode != null && (
              <p className="mt-3 text-sm accent-text">
                Episode {anime.airing.next_episode} airs
                {anime.airing.seconds_until != null
                  ? ` in ${Math.floor(anime.airing.seconds_until / 86400)}d ${Math.floor((anime.airing.seconds_until % 86400) / 3600)}h`
                  : ""}
              </p>
            )}

            {anime.genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {anime.genres.map((g) => (
                  <span key={g} className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">{g}</span>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {entry ? (
                <>
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="inline-flex items-center gap-2 rounded-md border border-foreground px-5 py-2.5 text-sm font-semibold"
                  >
                    <BookmarkCheck className="h-4 w-4" /> In your list
                  </button>
                  <button
                    onClick={() => toggleFavorite(entry.id)}
                    className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold ${
                      entry.is_favorite ? "accent-bg" : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${entry.is_favorite ? "fill-current" : ""}`} /> Favorite
                  </button>
                </>
              ) : (
                <button
                  onClick={() => addEntry({ ...anime, mal: malData })}
                  className="accent-bg inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-all hover:gap-3"
                >
                  <Plus className="h-4 w-4" /> Add to list
                </button>
              )}
              <Link to="/list" className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm">
                View my list
              </Link>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-12">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-md border border-border bg-surface p-1">
            {[
              ["overview", "Overview"],
              ["episodes", "Episodes"],
              ["characters", "Characters"],
              ["related", "Related"],
            ].map(([v, label]) => (
              <TabsTrigger key={v} value={v} className="rounded-md px-4 py-1.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-8">
            {anime.description && <p className="leading-relaxed text-muted-foreground whitespace-pre-line">{anime.description}</p>}

            <div className="grid gap-6 sm:grid-cols-2">
              <Facts anime={anime} />
              <MalFacts data={malData} unavailable={malUnavailable} loading={mal.isFetching} onRetry={() => mal.refetch()} />
            </div>

            {anime.studios.length > 0 && (
              <Section title="Studios">
                <div className="flex flex-wrap gap-2">
                  {anime.studios.map((s) => (
                    <span key={s.id} className="rounded-md border border-border px-3 py-1 text-xs">{s.name}</span>
                  ))}
                </div>
              </Section>
            )}

            {anime.staff.length > 0 && (
              <Section title="Staff">
                <div className="grid gap-2 sm:grid-cols-2">
                  {anime.staff.map((s) => (
                    <div key={`${s.id}-${s.role}`} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.role}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {anime.tags.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {anime.tags.filter((t) => !t.spoiler).slice(0, 20).map((t) => (
                    <span key={t.id} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {t.name}{t.rank != null ? ` ${t.rank}%` : ""}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="episodes" className="mt-6">
            <EpisodesPanel anime={anime} />
          </TabsContent>

          <TabsContent value="characters" className="mt-6">
            {anime.characters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No character data.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {anime.characters.map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-md border border-border bg-surface p-3">
                    {c.image && <img src={c.image} alt="" className="h-16 w-12 rounded object-cover" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{pretty(c.role)}</p>
                      {c.voice_actors[0] && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">CV: {c.voice_actors[0].name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="related" className="mt-6 space-y-8">
            <Section title="Relations">
              {anime.relations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No relations.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {anime.relations.map((r) => (
                    <RelatedCard key={`${r.relation}-${r.anilist_id}`} cover={r.cover} title={r.title} sub={`${pretty(r.relation)} · ${pretty(r.format) ?? r.type}`} routeId={r.type === "ANIME" ? routeIdFor(r) : null} />
                  ))}
                </div>
              )}
            </Section>
            {anime.recommendations.length > 0 && (
              <Section title="Recommended">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {anime.recommendations.map((r) => (
                    <RelatedCard key={r.anilist_id} cover={r.cover} title={r.title} sub="Recommended" routeId={routeIdFor(r)} />
                  ))}
                </div>
              </Section>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ anime }: { anime: Anime }) {
  const rows: Array<[string, string]> = [
    ["Format", pretty(anime.format) ?? "—"],
    ["Status", pretty(anime.status) ?? "—"],
    ["Aired", [anime.dates.start, anime.dates.end].filter(Boolean).join(" → ") || "—"],
    ["Popularity", anime.popularity != null ? anime.popularity.toLocaleString() : "—"],
  ];
  const top = anime.rankings.find((r) => r.all_time && r.type === "RATED");
  if (top) rows.push(["AniList rank", `#${top.rank} ${top.context}`]);
  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AniList</p>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MalFacts({
  data,
  unavailable,
  loading,
  onRetry,
}: {
  data: { score: number | null; rank: number | null; popularity: number | null; members: number | null } | null;
  unavailable: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">MyAnimeList</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : unavailable || !data ? (
        <p className="text-sm text-muted-foreground">
          Temporarily unavailable.
          <button onClick={onRetry} className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-foreground">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          {([
            ["Score", data.score != null ? data.score.toFixed(2) : "—"],
            ["Rank", data.rank != null ? `#${data.rank}` : "—"],
            ["Popularity", data.popularity != null ? `#${data.popularity}` : "—"],
            ["Members", data.members != null ? data.members.toLocaleString() : "—"],
          ] as Array<[string, string]>).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function EpisodesPanel({ anime }: { anime: Anime }) {
  const eps = useQuery({
    queryKey: ["episodes", anime.mal_id],
    queryFn: () => getEpisodes(anime),
    enabled: !!anime.mal_id,
    staleTime: 1000 * 60 * 60 * 6,
    retry: 0,
  });

  if (!anime.mal_id) return <p className="text-sm text-muted-foreground">No MyAnimeList entry, so episode details aren't available.</p>;
  if (eps.isFetching) return <p className="text-sm text-muted-foreground">Loading episodes…</p>;
  if (eps.data?.status === "unavailable" || !eps.data) {
    const count = anime.episodes ?? 0;
    return (
      <div>
      <p className="text-sm text-muted-foreground">
        Episode details from MyAnimeList are temporarily unavailable.
        <button onClick={() => eps.refetch()} className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-foreground">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </p>
      {count > 0 && (
        <ol className="mt-4 divide-y divide-border rounded-lg border border-border">
          {Array.from({ length: Math.min(count, 500) }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-8 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="font-medium">Episode {i + 1}</span>
            </li>
          ))}
        </ol>
      )}
      </div>
    );
  }
  if (eps.data.data.length === 0) return <p className="text-sm text-muted-foreground">No episode list published yet.</p>;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {eps.data.data.map((e) => (
        <div key={e.internal_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
          <span className="w-8 font-mono text-xs text-muted-foreground">{e.episode_number}</span>
          <span className="font-medium">{e.title ?? `Episode ${e.episode_number}`}</span>
          {e.title_japanese && <span className="text-xs text-muted-foreground">{e.title_japanese}</span>}
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {e.filler && <span className="rounded-md border border-border px-2 py-0.5">Filler</span>}
            {e.recap && <span className="rounded-md border border-border px-2 py-0.5">Recap</span>}
            {e.score != null && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{e.score.toFixed(1)}</span>}
            {e.air_date && <span>{new Date(e.air_date).toLocaleDateString()}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function RelatedCard({ cover, title, sub, routeId }: { cover: string | null; title: string; sub: string; routeId: string | null }) {
  const inner = (
    <>
      {cover && <img src={cover} alt="" className="h-16 w-12 rounded object-cover" />}
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </div>
    </>
  );
  const cls = "flex gap-3 rounded-md border border-border bg-surface p-3";
  if (!routeId) return <div className={cls}>{inner}</div>;
  return <Link to="/anime/$id" params={{ id: routeId }} className={`${cls} hover:border-foreground/40`}>{inner}</Link>;
}
