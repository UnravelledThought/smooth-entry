import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { showAccent?: boolean; title?: string };

/**
 * Sumi-e inspired mark: one confident tapered stroke forming an implied A,
 * with a short horizontal T bar cutting across the top. A small hanko-style
 * accent square anchors the baseline.
 */
export function LogoBrush({ showAccent = true, title = "AniTrack", ...props }: Props) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={title} fill="none" {...props}>
      <title>{title}</title>
      {/* Tapered brush "A" — a filled path so the stroke has variable width */}
      <path
        d="M6 28 L15 4 Q16 2.5 17 4 L26 28 L22.5 28 L20.5 22 L11.5 22 L9.5 28 Z M13 18 L19 18 L16 9 Z"
        fill="currentColor"
      />
      {/* T bar cutting across */}
      <path d="M9 8 L27 6.5 L27 9 L9 10.5 Z" fill="currentColor" />
      {/* Hanko accent stamp */}
      {showAccent && (
        <rect x="24" y="24" width="4.5" height="4.5" fill="var(--accent-color)" />
      )}
    </svg>
  );
}
