import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Palette } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() { return <Layout><Settings /></Layout>; }

const PRESETS = ["#ff2d6f", "#ffffff", "#00e5ff", "#ffd400", "#9eff00", "#ff8a00", "#b388ff", "#ff5252"];

function Settings() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const [color, setColor] = useState("#ff2d6f");
  const [saving, setSaving] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setColor(profile.accent_color);
  }, [profile]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", color);
  }, [color]);

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
    await supabase.from("profiles").update({ accent_color: color }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    const okTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!okTypes.includes(file.type)) {
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
      const { data: signed, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", user.id);
      await refreshProfile();
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12 space-y-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public page: <Link to="/u/$username" params={{ username: profile.username }} className="accent-text underline">/u/{profile.username}</Link>
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Profile picture</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2"
            style={{ borderColor: profile.accent_color }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl font-bold uppercase">{profile.username[0]}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onPickFile}
              disabled={uploading}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : profile.avatar_url ? "Change picture" : "Upload picture"}
            </button>
            <p className="text-xs text-muted-foreground">JPG, PNG or GIF · max 5MB</p>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" hidden onChange={onFile} />
        </div>
      </section>

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
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground"
        >
          <Palette className="h-4 w-4" /> {showCustom ? "Hide custom picker" : "Custom color"}
        </button>
        {showCustom && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
            <div className="accent-picker w-full max-w-[220px]">
              <HexColorPicker color={color} onChange={setColor} style={{ width: "100%" }} />
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
        )}
        <button onClick={save} disabled={saving} className="accent-bg rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save color"}
        </button>
      </section>
    </div>
  );
}
