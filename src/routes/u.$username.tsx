import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { usePublicProfile } from "@/lib/cloud-watchlist";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Star, Pencil, Check, X, Camera } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfileRoute,
});

function PublicProfileRoute() { return <Layout><PublicProfile /></Layout>; }

function PublicProfile() {
  const { username } = Route.useParams();
  const q = usePublicProfile(username);
  const { user, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply this user's accent for their page
  useEffect(() => {
    if (q.data?.profile.accent_color) {
      const prev = document.documentElement.style.getPropertyValue("--accent-color");
      document.documentElement.style.setProperty("--accent-color", q.data.profile.accent_color);
      return () => { document.documentElement.style.setProperty("--accent-color", prev || "#ff2d6f"); };
    }
  }, [q.data?.profile.accent_color]);

  useEffect(() => {
    if (q.data?.profile.bio) setBioDraft(q.data.profile.bio);
  }, [q.data?.profile.bio]);

  if (q.isLoading) return <div className="px-5 py-12 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">User not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">← Back</Link>
    </div>
  );

  const { profile, pinned } = q.data;
  const isOwner = user?.id === profile.id;

  const saveBio = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ bio: bioDraft }).eq("id", user!.id);
    await refreshProfile();
    q.refetch();
    setSaving(false);
    setIsEditing(false);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadError(null);
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setUploadError("Use JPG, PNG, or GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Max 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", user.id);
      await refreshProfile();
      q.refetch();
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2"
          style={{ borderColor: profile.accent_color }}
        >
          {(profile as any).avatar_url ? (
            <img src={(profile as any).avatar_url} alt={profile.username} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold">{profile.username[0].toUpperCase()}</span>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Change profile picture"
                title="Change profile picture"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" hidden onChange={onFile} />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold break-words">{profile.username}</h1>
          {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                rows={3}
                maxLength={240}
                className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
                placeholder="Tell other otakus about your taste."
              />
              <div className="flex items-center gap-2">
                <button onClick={saveBio} disabled={saving} className="inline-flex items-center gap-1.5 accent-bg rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setIsEditing(false); setBioDraft(profile.bio ?? ""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              {profile.bio ? (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio yet.</p>
              )}
              {isOwner && (
                <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
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
