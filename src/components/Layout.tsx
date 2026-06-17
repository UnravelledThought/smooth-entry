import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Compass, Search, LogIn, User as UserIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useAuth();

  const nav = [
    { to: "/" as const, label: "Discover", icon: Compass },
    { to: "/search" as const, label: "Search", icon: Search },
    { to: "/list" as const, label: "List", icon: Bookmark },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            ani<span className="accent-text">track</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {user && profile ? (
              <>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-foreground hover:text-background"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-color)" }} />
                  <span className="hidden sm:inline">{profile.username}</span>
                  <UserIcon className="h-3.5 w-3.5 sm:hidden" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-24 border-t border-border py-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        AniTrack · Jikan / MAL
      </footer>
    </div>
  );
}
