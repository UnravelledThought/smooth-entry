import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bookmark, CalendarClock, CalendarDays, Compass, Search, Settings } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchAnime, displayTitle, routeIdFor } from "@/lib/anime/service";

const PAGES = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { to: "/list", label: "My list", icon: Bookmark },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "/" && !isTyping(e.target)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["anilist", "search", debounced],
    queryFn: () => searchAnime(debounced),
    enabled: open && debounced.trim().length > 1,
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });
  const results = (data?.data ?? []).slice(0, 8);

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Search anime or jump to a page…" />
      <CommandList>
        <CommandEmpty>{isFetching ? "Searching…" : "Nothing found."}</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Anime">
            {results.map((a) => (
              <CommandItem
                key={a.anilist_id}
                value={`anime-${a.anilist_id}-${displayTitle(a)} ${a.titles.english ?? ""}`}
                onSelect={() => go(() => navigate({ to: "/anime/$id", params: { id: routeIdFor(a) } }))}
              >
                {a.images.cover && <img src={a.images.cover} alt="" className="h-10 w-7 rounded-sm object-cover" />}
                <span className="truncate">{displayTitle(a)}</span>
                {a.season_year && <span className="ml-auto text-xs text-muted-foreground">{a.season_year}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {PAGES.map(({ to, label, icon: Icon }) => (
            <CommandItem key={to} value={`page ${label}`} onSelect={() => go(() => navigate({ to }))}>
              <Icon className="h-4 w-4" /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
