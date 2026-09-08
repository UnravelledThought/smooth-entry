import { useEffect } from "react";
import { useSettings, DEFAULT_ACCENT } from "@/lib/local-store";

export function AccentApplier() {
  const { accent_color } = useSettings();
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", accent_color || DEFAULT_ACCENT);
  }, [accent_color]);
  return null;
}
