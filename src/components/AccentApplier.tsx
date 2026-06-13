import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export function AccentApplier() {
  const { profile } = useAuth();
  useEffect(() => {
    const color = profile?.accent_color || "#ff2d6f";
    document.documentElement.style.setProperty("--accent-color", color);
  }, [profile?.accent_color]);
  return null;
}
