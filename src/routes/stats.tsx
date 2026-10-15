import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useEntries, type LocalEntry } from "@/lib/local-store";
import { BarChart3, Clock, Film, Star, Trophy, Tv } from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — AniTrack" },
      { name: "description", content: "Episodes watched, hours spent, score distribution and top rated shows." },
      { property: "og:title", content: "Stats — AniTrack" },
      { property: "og:description", content: "Episodes watched, hours spent, score distribution and top rated shows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsRoute,
});

function StatsRoute() { return <Layout><StatsPage /></Layout>; }

const AVG_EP_MIN = 24;

function StatsPage() {
  const list = useEntries();
  const stats = useMemo(() => compute(list), [list]);

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold">No stats yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track shows to unlock insights.</p>
        <Link to="/" className="mt-6 inline-block accent-bg rounded-lg px-6 py-2.5 text-sm font-semibold">Browse</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Stats</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your tracking, by the numbers.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Tv} label="Total anime" value={stats.total.toString()} />
        <StatCard icon={Film} label="Episodes watched" value={stats.episodes.toLocaleString()} />
        <StatCard icon={Clock} label="Hours watched" value={stats.hours.toLocaleString()} sub={`${stats.days} days`} />
        <StatCard icon={Star} label="Mean score" value={stats.mean ? stats.mean.toFixed(2) : "—"} sub={`${stats.rated} rated`} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Anime stats</h2>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-border" aria-label="Anime status distribution">
          {stats.statusRows.map((r) => (
            <div key={r.key} className={`h-full ${STATUS_TONES[r.key]}`} style={{ width: `${r.pct}%` }} title={`${r.label}: ${r.count}`} />
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {stats.statusRows.map((r) => (
            <div key={r.key} className="grid grid-cols-[110px_minmax(0,1fr)_24px] items-center gap-3 text-xs sm:grid-cols-[140px_minmax(0,1fr)_32px]">
              <span className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_TONES[r.key]}`} />{r.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-border" role="meter" aria-label={r.label} aria-valuenow={r.count} aria-valuemin={0} aria-valuemax={stats.total}>
                <div className={`h-full rounded-full ${STATUS_TONES[r.key]}`} style={{ width: `${r.pct}%` }} />
              </div>
              <span className="text-right font-mono tabular-nums">{r.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Completion rate" value={`${stats.completionRate}%`} />
          <MiniStat label="Avg episodes / show" value={stats.avgEpisodes.toFixed(1)} />
          <MiniStat label="Longest run" value={stats.longest ? `${stats.longest.progress} ep` : "—"} sub={stats.longest?.title} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> Top rated
          </div>
          <div className="mt-4 space-y-2">
            {stats.topRated.length === 0 && <p className="text-sm text-muted-foreground">Rate shows to see them here.</p>}
            {stats.topRated.map((e, i) => (
              <Link
                key={e.id}
                to="/anime/$id"
                params={{ id: e.mal_id != null ? String(e.mal_id) : `al${e.anilist_id ?? 0}` }}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-background/50"
              >
                <span className="w-5 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                <img src={e.image_url} alt="" className="h-12 w-8 rounded object-cover" />
                <span className="flex-1 truncate text-sm">{e.title}</span>
                <span className="flex items-center gap-1 text-xs accent-text"><Star className="h-3 w-3 fill-current" />{e.personal_score?.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Score distribution</h2>
          <div className="mt-4 flex h-32 items-end gap-1">
            {stats.scoreBuckets.map((n, i) => {
              const max = Math.max(...stats.scoreBuckets, 1);
              return (
                <div key={i} className="flex h-full flex-1 flex-col justify-end items-center gap-1">
                  <div className="w-full accent-bg rounded-sm" style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? 2 : 0 }} />
                  <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function compute(list: LocalEntry[]) {
  const total = list.length;
  const episodes = list.reduce((s, e) => s + (e.progress || 0), 0);
  const minutes = list.reduce((sum, entry) => sum + (entry.progress || 0) * (entry.duration && entry.duration > 0 ? entry.duration : AVG_EP_MIN), 0);
  const hours = Math.round(minutes / 60 * 10) / 10;
  const days = Math.round((minutes / 60 / 24) * 10) / 10;

  const rated = list.filter((e) => e.personal_score != null);
  const mean = rated.length ? rated.reduce((s, e) => s + (e.personal_score ?? 0), 0) / rated.length : 0;

  const counts = { watching: 0, completed: 0, onhold: 0, plan: 0, dropped: 0 } as Record<string, number>;
  for (const e of list) counts[e.status]++;
  const statusRows = [
    { key: "watching", label: "Watching", count: counts.watching },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "onhold", label: "On-Hold", count: counts.onhold },
    { key: "dropped", label: "Dropped", count: counts.dropped },
    { key: "plan", label: "Plan to watch", count: counts.plan },
  ].map((r) => ({ ...r, pct: total ? (r.count / total) * 100 : 0 }));

  const completionRate = total ? Math.round((counts.completed / total) * 100) : 0;
  const avgEpisodes = total ? episodes / total : 0;
  const longest = list.slice().sort((a, b) => b.progress - a.progress)[0];

  const topRated = rated.slice().sort((a, b) => (b.personal_score ?? 0) - (a.personal_score ?? 0)).slice(0, 5);

  const scoreBuckets = Array.from({ length: 10 }, () => 0);
  for (const e of rated) {
    const idx = Math.min(9, Math.max(0, Math.ceil(e.personal_score ?? 0) - 1));
    scoreBuckets[idx]++;
  }

  return { total, episodes, hours, days, mean, rated: rated.length, statusRows, completionRate, avgEpisodes, longest, topRated, scoreBuckets };
}

const STATUS_TONES: Record<string, string> = {
  watching: "bg-primary",
  completed: "bg-foreground",
  onhold: "bg-primary/50",
  dropped: "bg-foreground/30",
  plan: "bg-muted-foreground",
};
