import * as React from "react";
import { LogoMonogram } from "./LogoMonogram";
import { LogoRing } from "./LogoRing";
import { LogoBrush } from "./LogoBrush";
import { LogoWordmark } from "./LogoWordmark";

type Variant = "monogram" | "ring" | "brush" | "wordmark" | "lockup";
type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  variant?: Variant;
  size?: Size;
  /** Force monochrome (hide accent layer). */
  mono?: boolean;
  showAccent?: boolean;
  className?: string;
  spin?: boolean; // ring only
};

const ICON_PX: Record<Size, number> = { sm: 20, md: 26, lg: 40, xl: 72 };
const TEXT_PX: Record<Size, string> = { sm: "0.95rem", md: "1.15rem", lg: "1.75rem", xl: "3rem" };

export function Logo({
  variant = "lockup",
  size = "md",
  mono = false,
  showAccent,
  className,
  spin,
}: Props) {
  const accent = showAccent ?? !mono;
  const px = ICON_PX[size];

  if (variant === "wordmark") {
    return (
      <span className={className} style={{ fontSize: TEXT_PX[size] }}>
        <LogoWordmark showAccent={accent} />
      </span>
    );
  }
  if (variant === "monogram") {
    return <LogoMonogram width={px} height={px} showAccent={accent} className={className} />;
  }
  if (variant === "ring") {
    return <LogoRing width={px * 1.4} height={px * 1.4} showAccent={accent} spin={spin} className={className} />;
  }
  if (variant === "brush") {
    return <LogoBrush width={px} height={px} showAccent={accent} className={className} />;
  }
  // lockup
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMonogram width={px} height={px} showAccent={accent} />
      <span style={{ fontSize: TEXT_PX[size] }}>
        <LogoWordmark showAccent={accent} />
      </span>
    </span>
  );
}
