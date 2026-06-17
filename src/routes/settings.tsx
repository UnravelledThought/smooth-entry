import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useMyEntries, useUpdateEntry } from "@/lib/cloud-watchlist";
import { supabase } from "@/integrations/supabase/client";
import { Pin, PinOff } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});


function SettingsRoute() { return <Layout><Settings /></Layout>; }

const PRESETS = ["#ff2d6f", "#ffffff", "#00e5ff", "#ffd400", "#9eff00", "#ff8a00", "#b388ff", "#ff5252"];

function Settings() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const [color, setColor] = useState("#ff2d6f");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (profile) { setColor(profile.accent_color); setBio(profile.bio ?? ""); }
  }, [profile]);

  // Live preview
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", color);
  }, [color]);

  const entries = useMyEntries();
  const update = useUpdateEntry();

  if (loading) return <div className="px-5 py-12 text-sm text-muted-foreground">Loading…</div>;
  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-sm text-muted-foreground">You need an account for this.</p>
        <Link to="/auth" className="mt-4 inline-block accent-bg rounded-lg px-5 py-2.5 text-sm font-medium">Sign in</Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ accent_color: color, bio }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
  };

  const pinned = entries.data?.filter((e) => e.is_pinned) ?? [];
  const others = entries.data?.filter((e) => !e.is_pinned) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-12">
      <div>
        <h1 className="font-display text-4xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public page: <Link to="/u/$username" params={{ username: profile.username }} className="accent-text underline">/u/{profile.username}</Link>
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Accent color</h2>
        <div className="flex flex-wrap items-center gap-3">
          {PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-border hover:scale-105"}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
          <div className="accent-picker">
            <HexColorPicker color={color} onChange={setColor} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Hex</span>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded border border-border" style={{ background: color }} />
              <span className="text-sm text-muted-foreground">#</span>
              <HexColorInput
                color={color}
                onChange={setColor}
                prefixed={false}
                className="w-28 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono uppercase outline-none focus:border-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">Drag the saturation and hue sliders or type a hex value.</p>
          </div>
        </div>
      </section>


      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Bio</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={240}
          className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
          placeholder="Tell other otakus about your taste."
        />
        <button onClick={save} disabled={saving} className="accent-bg rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Pinned anime ({pinned.length})</h2>
        <p className="text-xs text-muted-foreground">Pinned anime appear on your public profile.</p>
        {entries.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="space-y-1.5">
            {[...pinned, ...others].map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
                <img src={e.image_url} alt="" className="h-12 w-9 rounded object-cover" />
                <div className="flex-1 truncate text-sm">{e.title}</div>
                <button
                  onClick={() => update.mutate({ id: e.id, patch: { is_pinned: !e.is_pinned } })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${e.is_pinned ? "accent-bg" : "border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {e.is_pinned ? <><PinOff className="h-3 w-3" /> Unpin</> : <><Pin className="h-3 w-3" /> Pin</>}
                </button>
              </div>
            ))}
            {entries.data?.length === 0 && <p className="text-sm text-muted-foreground">No anime in your list yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
