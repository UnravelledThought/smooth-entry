import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, CalendarClock, Compass, Search, Settings as SettingsIcon, BarChart3 } from "lucide-react";
import { ImportMetadataSync } from "./ImportMetadataSync";
import { Logo } from "./Logo";

export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/" as const, label: "Discover", icon: Compass },
    { to: "/search" as const, label: "Search", icon: Search },
    { to: "/upcoming" as const, label: "Upcoming", icon: CalendarClock },
    { to: "/list" as const, label: "List", icon: Bookmark },
    { to: "/stats" as const, label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ImportMetadataSync />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>ani<span className="accent-text">track</span></span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <Link
            to="/settings"
            aria-label="Settings"
            className={`grid h-9 w-9 place-items-center rounded-md border border-border transition-colors ${
              path === "/settings" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 border-t border-border py-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        AniTrack · Jikan / MAL
      </footer>
    </div>
  );
}
