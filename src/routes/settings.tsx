import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Layout } from "@/components/Layout";
import { Palette, Download, Upload, Save, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import {
  useProfile, updateProfile, uploadAvatar,
  useSettings, setAccentColor, getEntriesSnapshot, exportBackup, importBackup, clearAll,
} from "@/lib/local-store";
import { isTooDark, readableAccent } from "@/lib/accent";
import { toMalXml, parseMalXml, importEntries, malExportable } from "@/lib/mal-io";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AniTrack" },
      { name: "description", content: "Pick your accent color, back up your list, or import from MyAnimeList." },
      { property: "og:title", content: "Settings — AniTrack" },
      { property: "og:description", content: "Pick your accent color, back up your list, or import from MyAnimeList." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() { return <Layout><Settings /></Layout>; }

const PRESETS = ["#ff2d6f", "#ffffff", "#00e5ff", "#ffd400", "#9eff00", "#ff8a00", "#b388ff", "#ff5252"];

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Settings() {
  const settings = useSettings();
  const [color, setColor] = useState(settings.accent_color);
  const [showCustom, setShowCustom] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const synced = useRef(false);

  useEffect(() => {
    // Follow external changes too (e.g. restoring a backup).
    setColor(settings.accent_color);
    synced.current = true;
  }, [settings.accent_color]);

  // Live preview
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", readableAccent(color));
  }, [color]);

  // Debounced save
  useEffect(() => {
    if (!synced.current || color === settings.accent_color) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setAccentColor(color), 300);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [color, settings.accent_color]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12 space-y-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved to your account, so it follows you to any device.
        </p>
      </div>

      <ProfileSection />

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Accent color</h2>
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
        {isTooDark(color) && (
          <p className="text-xs text-muted-foreground">
            This color is hard to read on black, so a lighter shade (<span className="accent-text font-medium">{readableAccent(color).toUpperCase()}</span>) is used instead.
          </p>
        )}
        {showCustom && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
            <div className="accent-picker w-full max-w-[220px]">
              <HexColorPicker color={color} onChange={setColor} style={{ width: "100%" }} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Hex</span>
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

      <BackupSection />
    </div>
  );
}

function ProfileSection() {
  const profile = useProfile();
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setBio(profile?.bio ?? ""); }, [profile?.bio]);
  if (!profile) return null;

  const onFile = async (f: File) => {
    setBusy(true);
    try { await uploadAvatar(f); toast.success("Profile picture updated."); }
    catch (e: any) { toast.error(e.message ?? "Upload failed."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Profile</h2>
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 sm:flex-row">
        <div className="flex flex-col items-center gap-3">
          <Avatar profile={profile} className="h-24 w-24 text-2xl" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" /> {busy ? "Uploading…" : "Change picture"}
          </button>
          <span className="text-[10px] text-muted-foreground">JPG, PNG or GIF · up to 25 MB</span>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-lg font-semibold">{profile.username}</div>
          <textarea
            value={bio}
            maxLength={300}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you"
            className="h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            onClick={async () => {
              try { await updateProfile({ bio: bio.trim() }); toast.success("Bio saved."); }
              catch { toast.error("Couldn't save your bio."); }
            }}
            disabled={bio === (profile.bio ?? "")}
            className="rounded-md accent-bg px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            Save bio
          </button>
        </div>
      </div>
    </section>
  );
}

function BackupSection() {
  const [msg, setMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const xmlRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const exportXml = () => {
    const entries = getEntriesSnapshot();
    const exportable = malExportable(entries);
    download(`anitrack-export-${new Date().toISOString().slice(0, 10)}.xml`, toMalXml(entries), "application/xml");
    const skipped = entries.length - exportable.length;
    setMsg(`Exported ${exportable.length} entries as MyAnimeList XML.${skipped ? ` ${skipped} title${skipped === 1 ? "" : "s"} without a MyAnimeList page can't be exported.` : ""}`);
  };

  const exportJson = () => {
    download(`anitrack-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), "application/json");
    setMsg("Backup file saved.");
  };

  const importXml = async (file: File) => {
    setImporting(true);
    setMsg("Importing your list and fetching artwork…");
    try {
      const parsed = parseMalXml(await file.text());
      if (parsed.length === 0) throw new Error("No entries found in file.");
      const res = await importEntries(parsed);
      setMsg(`Imported ${res.imported} new · skipped ${res.skipped} duplicates.${res.missingArtwork ? ` Artwork unavailable for ${res.missingArtwork} entries; your list is saved.` : " Artwork saved."}`);
    } catch (e: any) {
      setMsg(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
      if (xmlRef.current) xmlRef.current.value = "";
    }
  };

  const [pendingRestore, setPendingRestore] = useState<string | null>(null);

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      JSON.parse(text);
      setPendingRestore(text);
    } catch {
      setMsg("Restore failed: that file isn't a valid backup.");
    } finally {
      if (jsonRef.current) jsonRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    try {
      const n = await importBackup(pendingRestore);
      setMsg(`Restored ${n} entries from backup.`);
    } catch (e: any) {
      setMsg(`Restore failed: ${e.message}`);
    } finally {
      setPendingRestore(null);
    }
  };

  const [confirmWipe, setConfirmWipe] = useState(false);

  const wipe = async () => {
    try { await clearAll(); setMsg("Your list was cleared."); }
    catch { setMsg("Couldn't clear your list. Try again."); }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Backup &amp; transfer</h2>
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Save a backup file to move your list to another browser, or bring in a MyAnimeList export.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportJson}
            className="inline-flex items-center gap-2 rounded-md accent-bg px-4 py-2 text-sm font-medium"
          >
            <Save className="h-3.5 w-3.5" /> Export backup
          </button>
          <button
            onClick={() => jsonRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground hover:text-background"
          >
            <Upload className="h-3.5 w-3.5" /> Restore backup
          </button>
          <button
            onClick={exportXml}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground hover:text-background"
          >
            <Download className="h-3.5 w-3.5" /> Export MAL XML
          </button>
          <button
            onClick={() => xmlRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground hover:text-background"
          >
            <Upload className="h-3.5 w-3.5" /> Import MAL XML
          </button>
          <input
            ref={xmlRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importXml(f); }}
          />
          <input
            ref={jsonRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }}
          />
        </div>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <button
          onClick={() => setConfirmWipe(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear all data
        </button>
      </div>

      <AlertDialog open={pendingRestore != null} onOpenChange={(o) => { if (!o) setPendingRestore(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your list with this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current list ({getEntriesSnapshot().length} entries), progress and ratings will be replaced by what's in the backup file. Export a backup first if you want to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Replace list</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmWipe} onOpenChange={setConfirmWipe}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your entire list, favorites, and settings from this browser. Export a backup first if you want to keep anything. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={wipe}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
