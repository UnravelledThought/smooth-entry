import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bookmark, Compass, Search, Sparkles } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";

export function Layout() {
  const list = useWatchlist();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav: { to: "/" | "/search" | "/list"; label: string; icon: typeof Compass; count?: number }[] = [
    { to: "/", label: "Discover", icon: Compass },
    { to: "/search", label: "Search", icon: Search },
    { to: "/list", label: "My List", icon: Bookmark, count: list.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">otaku<span className="text-primary">.</span></span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
            {nav.map(({ to, label, icon: Icon, count }) => {
              const active = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {"count" in (nav.find((n) => n.to === to) ?? {}) && count ? (
                    <span className={`rounded-full px-1.5 text-xs ${active ? "bg-background/20" : "bg-primary/20 text-primary"}`}>
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Powered by Jikan / MyAnimeList · Local watchlist stored on your device
      </footer>
    </div>
  );
}
