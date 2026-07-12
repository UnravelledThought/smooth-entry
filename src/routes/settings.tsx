import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Download, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toMalXml, parseMalXml, importEntries } from "@/lib/mal-io";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() { return <Layout><Settings /></Layout>; }

const PRESETS = ["#ff2d6f", "#ffffff", "#00e5ff", "#ffd400", "#9eff00", "#ff8a00", "#b388ff", "#ff5252"];

function Settings() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const [color, setColor] = useState("#ff2d6f");
  const [showCustom, setShowCustom] = useState(false);
  const initialized = useRef(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (profile && !initialized.current) {
      setColor(profile.accent_color);
      initialized.current = true;
    }
  }, [profile]);

  // Live preview
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", color);
  }, [color]);

  // Auto-save (debounced) when color changes
  useEffect(() => {
    if (!user || !initialized.current) return;
    if (profile && color === profile.accent_color) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await supabase.from("profiles").update({ accent_color: color }).eq("id", user.id);
      await refreshProfile();
    }, 400);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [color, user, profile, refreshProfile]);

  if (loading) return <div className="px-5 py-12 text-sm text-muted-foreground">Loading…</div>;
  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-sm text-muted-foreground">You need an account for this.</p>
        <Link to="/auth" className="mt-4 inline-block accent-bg rounded-lg px-5 py-2.5 text-sm font-medium">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12 space-y-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Settings</h1>
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
          <button
            onClick={() => setShowCustom((s) => !s)}
            className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-transform hover:scale-105 ${showCustom ? "border-foreground" : "border-border"}`}
            aria-label="Custom color"
            title="Custom color"
          >
            <Palette className="h-4 w-4" style={{ color }} />
          </button>
        </div>
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
              <p className="text-xs text-muted-foreground">Changes save automatically.</p>
            </div>
          </div>
        )}
      </section>

      <ImportExport userId={user.id} />
    </div>
  );
}

function ImportExport({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await supabase.from("watchlist_entries").select("*").eq("user_id", userId);
      const xml = toMalXml((data ?? []) as any);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anitrack-export-${new Date().toISOString().slice(0, 10)}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${data?.length ?? 0} entries.`);
    } catch (e: any) {
      setMsg(`Export failed: ${e.message}`);
    } finally { setBusy(false); }
  };

  const doImport = async (file: File) => {
    setBusy(true); setMsg(null);
    try {
      const text = await file.text();
      const parsed = parseMalXml(text);
      if (parsed.length === 0) throw new Error("No entries found in file.");
      const res = await importEntries(userId, parsed);
      setMsg(`Imported ${res.imported} new · skipped ${res.skipped} duplicates.`);
      qc.invalidateQueries({ queryKey: ["entries", userId] });
    } catch (e: any) {
      setMsg(`Import failed: ${e.message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Import / Export</h2>
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Compatible with MyAnimeList XML export. Bring your history in or take it with you.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doExport}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export XML
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full accent-bg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> Import MAL XML
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); }}
          />
        </div>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>
    </section>
  );
}
