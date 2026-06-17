import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { usePublicProfile } from "@/lib/cloud-watchlist";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Star, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfileRoute,
});

function PublicProfileRoute() { return <Layout><PublicProfile /></Layout>; }

function PublicProfile() {
  const { username } = Route.useParams();
  const q = usePublicProfile(username);

  // Apply this user's accent for their page
  useEffect(() => {
    if (q.data?.profile.accent_color) {
      const prev = document.documentElement.style.getPropertyValue("--accent-color");
      document.documentElement.style.setProperty("--accent-color", q.data.profile.accent_color);
      return () => { document.documentElement.style.setProperty("--accent-color", prev || "#ff2d6f"); };
    }
  }, [q.data?.profile.accent_color]);

  if (q.isLoading) return <div className="px-5 py-12 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">User not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">← Back</Link>
    </div>
  );

  const { profile, pinned } = q.data;
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full border-2" style={{ borderColor: profile.accent_color }}>
          <span className="font-display text-2xl font-bold">{profile.username[0].toUpperCase()}</span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{profile.username}</h1>
          {profile.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      <h2 className="mt-12 text-xs uppercase tracking-widest text-muted-foreground">Pinned anime</h2>
      {pinned.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">This user hasn't pinned anything yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pinned.map((e) => (
            <Link
              key={e.id}
              to="/anime/$id"
              params={{ id: String(e.mal_id) }}
              className="group flex gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-foreground"
            >
              <img src={e.image_url} alt="" className="h-24 w-16 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-medium leading-tight group-hover:accent-text">{e.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{e.status}</span>
                  {e.personal_score != null && (
                    <span className="inline-flex items-center gap-1 rounded-full accent-bg px-2 py-0.5 font-medium">
                      <Star className="h-3 w-3 fill-current" /> {e.personal_score.toFixed(1)}
                    </span>
                  )}
                  {e.mal_score != null && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      MAL {Number(e.mal_score).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
