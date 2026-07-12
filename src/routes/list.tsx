import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bookmark, Minus, Plus, Trash2, Star, Share2, Pin, PinOff, Search as SearchIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useMyEntries, useUpdateEntry, useDeleteEntry,
  type WatchStatus, type CloudEntry,
} from "@/lib/cloud-watchlist";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/list")({ component: ListRoute });

function ListRoute() { return <Layout><ListPage /></Layout>; }

const STATUSES: { key: WatchStatus; label: string }[] = [
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "plan", label: "Plan to watch" },
  { key: "dropped", label: "Dropped" },
];

type SortKey = "updated" | "title" | "mal_score" | "personal_score" | "progress";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "updated", label: "Recently updated" },
  { key: "title", label: "Title A–Z" },
  { key: "mal_score", label: "MAL score" },
  { key: "personal_score", label: "My score" },
  { key: "progress", label: "Progress" },
];

function ListPage() {
  const { user, loading } = useAuth();
  const q = useMyEntries();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const list = q.data ?? [];

  const filtered = useMemo(() => {
    const qs = query.trim().toLowerCase();
    let out = qs ? list.filter((e) => e.title.toLowerCase().includes(qs)) : list.slice();
    out.sort((a, b) => {
      switch (sort) {
        case "title": return a.title.localeCompare(b.title);
        case "mal_score": return (Number(b.mal_score) || 0) - (Number(a.mal_score) || 0);
        case "personal_score": return (Number(b.personal_score) || 0) - (Number(a.personal_score) || 0);
        case "progress": return b.progress - a.progress;
        default: return (b.updated_at || "").localeCompare(a.updated_at || "");
      }
    });
    return out;
  }, [list, query, sort]);

  if (loading || !user) return <div className="px-5 py-12 text-sm text-muted-foreground">Redirecting to sign in…</div>;
  if (q.isLoading) return <div className="px-5 py-12 text-sm text-muted-foreground">Loading your list…</div>;

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border">
          <Bookmark className="h-5 w-5" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Empty list</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add shows from Discover or Search.</p>
        <Link to="/" className="mt-6 inline-block accent-bg rounded-lg px-6 py-2.5 text-sm font-semibold">Browse</Link>
      </div>
    );
  }

  const toggleSel = (id: string) => setSelection((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const clearSel = () => setSelection(new Set());

  const bulkStatus = async (status: WatchStatus) => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    await supabase.from("watchlist_entries").update({ status }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["entries", user.id] });
    clearSel();
  };
  const bulkDelete = async () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} entries?`)) return;
    await supabase.from("watchlist_entries").delete().in("id", ids);
    qc.invalidateQueries({ queryKey: ["entries", user.id] });
    clearSel();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">My list</h1>
          <p className="mt-2 text-sm text-muted-foreground">{list.length} tracked · {filtered.length} shown</p>
        </div>
        <Link to="/stats" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">View stats →</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your list…"
            className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-9 text-sm outline-none focus:border-foreground/40"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none"
        >
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <Tabs defaultValue="watching" className="mt-6">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-full border border-border bg-surface p-1">
          {STATUSES.map(({ key, label }) => {
            const count = filtered.filter((e) => e.status === key).length;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background"
              >
                {label}
                <span className="ml-2 text-xs text-muted-foreground data-[state=active]:text-background/70">{count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {STATUSES.map(({ key, label }) => {
          const items = filtered.filter((e) => e.status === key);
          return (
            <TabsContent key={key} value={key} className="mt-6">
              {items.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Nothing in {label.toLowerCase()}.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} selected={selection.has(entry.id)} onToggleSelect={() => toggleSel(entry.id)} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {selection.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[95vw] items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm shadow-lg backdrop-blur">
          <span className="px-2 font-medium">{selection.size} selected</span>
          <span className="text-muted-foreground">Set:</span>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => bulkStatus(s.key)}
              className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-foreground hover:text-background"
            >
              {s.label}
            </button>
          ))}
          <button onClick={bulkDelete} className="rounded-full border border-border px-2.5 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground">
            Delete
          </button>
          <button onClick={clearSel} className="ml-1 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, selected, onToggleSelect }: { entry: CloudEntry; selected: boolean; onToggleSelect: () => void }) {
  const update = useUpdateEntry();
  const del = useDeleteEntry();
  const pct = entry.episodes ? Math.min(100, (entry.progress / entry.episodes) * 100) : 0;

  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-surface transition-colors ${selected ? "accent-border" : "border-border hover:border-foreground/40"}`}>
      <label className="absolute left-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border bg-background/80 backdrop-blur">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="accent-primary" />
      </label>
      <button
        onClick={() => del.mutate(entry.id)}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity hover:bg-background group-hover:opacity-100"
        aria-label="Remove"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <div className="flex gap-3 p-3 pl-10">
        <Link to="/anime/$id" params={{ id: String(entry.mal_id) }} className="shrink-0">
          <img src={entry.image_url} alt="" className="h-24 w-16 rounded-lg object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/anime/$id"
            params={{ id: String(entry.mal_id) }}
            className="line-clamp-2 text-sm font-semibold leading-tight hover:accent-text"
          >
            {entry.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />{entry.mal_score ? Number(entry.mal_score).toFixed(2) : "—"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs accent-text">
              <Star className="h-3 w-3 fill-current" />{entry.personal_score?.toFixed(1) ?? "—"}
            </span>
          </div>
          <select
            value={entry.status}
            onChange={(e) => update.mutate({ id: entry.id, patch: { status: e.target.value as WatchStatus } })}
            className="mt-2 rounded border border-border bg-background px-2 py-1 text-xs outline-none"
          >
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3 border-t border-border bg-background/30 p-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Episodes</span>
            <span className="font-mono text-foreground">{entry.progress}/{entry.episodes ?? "?"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => update.mutate({ id: entry.id, patch: { progress: Math.max(0, entry.progress - 1) } })}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border hover:bg-foreground hover:text-background"
            ><Minus className="h-3 w-3" /></button>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full accent-bg" style={{ width: `${pct}%` }} />
            </div>
            <button
              onClick={() => {
                const next = entry.progress + 1;
                const completed = entry.episodes && next >= entry.episodes;
                update.mutate({ id: entry.id, patch: {
                  progress: entry.episodes ? Math.min(entry.episodes, next) : next,
                  status: completed ? "completed" : entry.status,
                }});
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border hover:bg-foreground hover:text-background"
            ><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Your rating</span>
            <span className="font-mono text-foreground">{entry.personal_score?.toFixed(1) ?? "—"}/10</span>
          </div>
          <input
            type="range" min={0} max={10} step={0.1}
            value={entry.personal_score ?? 0}
            onChange={(e) => update.mutate({ id: entry.id, patch: { personal_score: parseFloat(e.target.value) } })}
            className="w-full accent-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => update.mutate({ id: entry.id, patch: {
              is_shared: !entry.is_shared,
              shared_at: entry.is_shared ? null : new Date().toISOString(),
            }})}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              entry.is_shared ? "accent-bg" : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-3 w-3" /> {entry.is_shared ? "Shared" : "Share"}
          </button>
          <button
            onClick={() => update.mutate({ id: entry.id, patch: { is_pinned: !entry.is_pinned } })}
            className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              entry.is_pinned ? "accent-bg" : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {entry.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {entry.is_pinned ? "Pinned" : "Pin"}
          </button>
        </div>
      </div>
    </div>
  );
}
