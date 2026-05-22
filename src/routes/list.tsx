import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useWatchlist, updateEntry, removeFromList, type Status } from "@/lib/watchlist";
import { Bookmark, Minus, Plus, Trash2 } from "lucide-react";

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

      <div className="mt-10 space-y-10">
        {STATUSES.map(({ key, label }) => {
          const items = list.filter((e) => e.status === key);
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-bold">
                {label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
              </h2>
              <div className="space-y-3">
                {items.map((entry) => {
                  const pct = entry.episodes ? Math.min(100, (entry.progress / entry.episodes) * 100) : 0;
                  return (
                    <div
                      key={entry.id}
                      className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 transition-all hover:border-primary/40"
                    >
                      <Link to="/anime/$id" params={{ id: String(entry.id) }} className="shrink-0">
                        <img src={entry.image} alt={entry.title} className="h-20 w-14 rounded-lg object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/anime/$id"
                          params={{ id: String(entry.id) }}
                          className="block truncate font-semibold hover:text-primary"
                        >
                          {entry.title}
                        </Link>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center gap-1 rounded-full border border-border bg-background">
                            <button
                              onClick={() => updateEntry(entry.id, { progress: Math.max(0, entry.progress - 1) })}
                              className="grid h-8 w-8 place-items-center rounded-l-full hover:bg-muted"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[3.5rem] text-center text-sm font-mono">
                              {entry.progress}<span className="text-muted-foreground">/{entry.episodes ?? "?"}</span>
                            </span>
                            <button
                              onClick={() => {
                                const next = entry.progress + 1;
                                const completed = entry.episodes && next >= entry.episodes;
                                updateEntry(entry.id, {
                                  progress: entry.episodes ? Math.min(entry.episodes, next) : next,
                                  status: completed ? "completed" : entry.status,
                                });
                              }}
                              className="grid h-8 w-8 place-items-center rounded-r-full hover:bg-muted"
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <select
                            value={entry.status}
                            onChange={(e) => updateEntry(entry.id, { status: e.target.value as Status })}
                            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none"
                          >
                            {STATUSES.map((s) => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        {entry.episodes && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromList(entry.id)}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
