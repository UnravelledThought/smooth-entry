import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { showAccent?: boolean; title?: string };

/**
 * Minimal mark: rounded square containing a play triangle (watch/track),
 * with a small accent dot in the top-right as a "new episode" indicator.
 */
export function LogoMonogram({ showAccent = true, title = "AniTrack", ...props }: Props) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={title} fill="none" {...props}>
      <title>{title}</title>
      {/* Rounded square base */}
      <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
      {/* Play triangle cut-out (inverse) */}
      <path d="M13 10.5 L22 16 L13 21.5 Z" fill="var(--background, #000)" />
      {/* Accent dot */}
      {showAccent && (
        <circle cx="25" cy="7" r="3" fill="var(--accent-color)" stroke="var(--background, #000)" strokeWidth="1.5" />
      )}
    </svg>
  );
}
