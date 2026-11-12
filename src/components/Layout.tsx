import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, CalendarDays, CalendarClock, Compass, Search, Settings as SettingsIcon, BarChart3, User, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut, profileSlug } from "@/lib/local-store";
import { Avatar } from "./Avatar";
import { ImportMetadataSync } from "./ImportMetadataSync";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";

function AccountMenu() {
  const { ready, profile, userId } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  if (!ready) return <span className="h-9 w-9" />;
  if (!userId || !profile) {
    return (
      <Link to="/auth" className="rounded-md accent-bg px-3 py-1.5 text-sm font-medium">
        Sign in
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground">
        <Avatar profile={profile} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="truncate">{profile.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/u/$slug" params={{ slug: profileSlug(profile) }}><User className="mr-2 h-3.5 w-3.5" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings"><SettingsIcon className="mr-2 h-3.5 w-3.5" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await qc.cancelQueries();
            await signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/" as const, label: "Discover", icon: Compass },
    { to: "/search" as const, label: "Search", icon: Search },
    { to: "/schedule" as const, label: "Schedule", icon: CalendarDays },
    { to: "/upcoming" as const, label: "Upcoming", icon: CalendarClock },
    { to: "/list" as const, label: "List", icon: Bookmark },
    { to: "/stats" as const, label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ImportMetadataSync />
      <CommandPalette />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>ani<span className="accent-text">track</span></span>
          </Link>
          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
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
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <AccountMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 border-t border-border py-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        AniTrack · Jikan / MAL
      </footer>
    </div>
  );
}
