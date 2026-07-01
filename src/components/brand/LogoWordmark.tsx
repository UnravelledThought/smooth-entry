import * as React from "react";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  showAccent?: boolean;
};

/**
 * Wordmark: "aniTrack" in Syne. The dot on the "i" gets recolored via
 * a small overlaid accent square positioned over the natural glyph dot.
 * Falls back to a pure text wordmark when accent is hidden.
 */
export function LogoWordmark({ showAccent = true, className, ...props }: Props) {
  return (
    <span
      className={`font-display inline-flex items-baseline text-current leading-none ${className ?? ""}`}
      style={{ letterSpacing: "-0.035em", fontWeight: 700, fontFamily: "Syne, system-ui, sans-serif" }}
      {...props}
    >
      <span>an</span>
      <span className="relative inline-block">
        <span>i</span>
        {showAccent && (
          <span
            aria-hidden
            className="absolute rounded-[1px]"
            style={{
              top: "0.05em",
              left: "50%",
              transform: "translateX(-50%)",
              width: "0.22em",
              height: "0.22em",
              background: "var(--accent-color)",
              boxShadow: "0 0 0 0.06em var(--background, #000)",
            }}
          />
        )}
      </span>
      <span>Track</span>
    </span>
  );
}
