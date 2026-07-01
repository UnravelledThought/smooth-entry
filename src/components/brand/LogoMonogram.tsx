import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { showAccent?: boolean; title?: string };

export function LogoMonogram({ showAccent = true, title = "AniTrack", ...props }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      fill="none"
      {...props}
    >
      <title>{title}</title>
      {/* Base layer — inherits currentColor */}
      <g stroke="currentColor" strokeWidth={2.6} strokeLinecap="square" strokeLinejoin="miter">
        {/* Shared top bar */}
        <line x1="3" y1="6.5" x2="29" y2="6.5" />
        {/* A — left leg */}
        <line x1="3" y1="6.5" x2="9" y2="28" />
        {/* A — right leg */}
        <line x1="15" y1="6.5" x2="9" y2="28" />
        {/* A — inner crossbar */}
        <line x1="5.5" y1="18.5" x2="12.5" y2="18.5" />
        {/* T — stem */}
        <line x1="22" y1="6.5" x2="22" y2="28" />
      </g>
      {/* Accent — the "track" slash through the T stem */}
      {showAccent && (
        <line
          x1="26.5"
          y1="14"
          x2="17.5"
          y2="23"
          stroke="var(--accent-color)"
          strokeWidth={2.6}
          strokeLinecap="square"
        />
      )}
    </svg>
  );
}
