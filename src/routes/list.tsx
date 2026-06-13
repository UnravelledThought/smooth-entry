import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useWatchlist, updateEntry, removeFromList, type Status } from "@/lib/watchlist";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bookmark, Minus, Plus, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/list")({
  component: ListRoute,
});

function ListRoute() {
  return (
    <Layout>
      <ListPage />
    </Layout>
  );
}

const STATUSES: { key: Status; label: string }[] = [
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "plan", label: "Plan to watch" },
  { key: "dropped", label: "Dropped" },
];

function ListPage() {
  const list = useWatchlist();

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Bookmark className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your list is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Add shows from Discover or Search to start tracking your progress.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse anime
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold">My list</h1>
      <p className="mt-2 text-muted-foreground">{list.length} {list.length === 1 ? "title" : "titles"} tracked.</p>

      <Tabs defaultValue="watching" className="mt-10">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl bg-muted/50 p-1.5">
          {STATUSES.map(({ key, label }) => {
            const count = list.filter((e) => e.status === key).length;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {label}
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {STATUSES.map(({ key, label }) => {
          const items = list.filter((e) => e.status === key);
          return (
            <TabsContent key={key} value={key} className="mt-6">
              {items.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No anime in {label.toLowerCase()}.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((entry) => {
                    const pct = entry.episodes ? Math.min(100, (entry.progress / entry.episodes) * 100) : 0;
                    return (
                      <div
                        key={entry.id}
                        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                      >
                        <button
                          onClick={() => removeFromList(entry.id)}
                          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex gap-4 p-4">
                          <Link to="/anime/$id" params={{ id: String(entry.id) }} className="shrink-0">
                            <img src={entry.image} alt={entry.title} className="h-28 w-20 rounded-xl object-cover" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              to="/anime/$id"
                              params={{ id: String(entry.id) }}
                              className="line-clamp-2 font-display text-base font-semibold leading-tight hover:text-primary"
                            >
                              {entry.title}
                            </Link>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                {entry.malScore?.toFixed(2) ?? "—"}
                                <span className="text-[10px] font-normal text-amber-500/70">MAL</span>
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <Star className="h-3 w-3 fill-current" />
                                {entry.score?.toFixed(1) ?? "—"}
                                <span className="text-[10px] font-normal text-primary/70">you</span>
                              </span>
                            </div>

                            <select
                              value={entry.status}
                              onChange={(e) => updateEntry(entry.id, { status: e.target.value as Status })}
                              className="mt-2 rounded-full border border-border bg-background px-3 py-1 text-xs outline-none"
                            >
                              {STATUSES.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3 border-t border-border/60 bg-muted/20 p-4">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                              <span>Episodes</span>
                              <span className="font-mono text-foreground">
                                {entry.progress}<span className="text-muted-foreground">/{entry.episodes ?? "?"}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateEntry(entry.id, { progress: Math.max(0, entry.progress - 1) })}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background hover:bg-muted"
                                aria-label="Decrease"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <button
                                onClick={() => {
                                  const next = entry.progress + 1;
                                  const completed = entry.episodes && next >= entry.episodes;
                                  updateEntry(entry.id, {
                                    progress: entry.episodes ? Math.min(entry.episodes, next) : next,
                                    status: completed ? "completed" : entry.status,
                                  });
                                }}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background hover:bg-muted"
                                aria-label="Increase"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                              <span>Your rating</span>
                              <span className="font-mono text-foreground">
                                {entry.score?.toFixed(1) ?? "—"}<span className="text-muted-foreground">/10.0</span>
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={0.1}
                              value={entry.score ?? 0}
                              onChange={(e) => updateEntry(entry.id, { score: parseFloat(e.target.value) })}
                              className="w-full accent-primary"
                              aria-label="Personal rating"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
