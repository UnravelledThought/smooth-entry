import { useEffect } from "react";
import { useSettings, DEFAULT_ACCENT, startSession } from "@/lib/local-store";
import { readableAccent } from "@/lib/accent";

export function AccentApplier() {
  const { accent_color } = useSettings();
  useEffect(() => { startSession(); }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", readableAccent(accent_color || DEFAULT_ACCENT));
  }, [accent_color]);
  return null;
}
