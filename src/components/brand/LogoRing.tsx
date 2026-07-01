import * as React from "react";
import { LogoMonogram } from "./LogoMonogram";

type Props = React.SVGProps<SVGSVGElement> & {
  showAccent?: boolean;
  title?: string;
  /** spin the accent arc — used for loading states */
  spin?: boolean;
};

export function LogoRing({ showAccent = true, spin = false, title = "AniTrack", ...props }: Props) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={title} fill="none" {...props}>
      <title>{title}</title>
      {/* Dim base ring */}
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={2}
        fill="none"
      />
      {/* Accent arc — ~90° top-right */}
      {showAccent && (
        <g
          style={
            spin
              ? { transformOrigin: "24px 24px", animation: "logo-ring-spin 1.4s linear infinite" }
              : undefined
          }
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="var(--accent-color)"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${(Math.PI * 2 * 22) / 4} ${Math.PI * 2 * 22}`}
            transform="rotate(-90 24 24)"
          />
        </g>
      )}
      {/* Monogram inside, scaled down */}
      <g transform="translate(8 8) scale(1)">
        <LogoMonogram width={32} height={32} showAccent={showAccent} />
      </g>
      <style>{`@keyframes logo-ring-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
