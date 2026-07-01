import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Palette } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

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

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Logo variant="ring" size="lg" spin /></div>;
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
    </div>
  );
}
