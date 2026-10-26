type Props = { className?: string; variant?: "frame" | "monogram" };

/** AniTrack logo. Neutral parts follow text color; the accent part follows --accent-color. */
export function Logo({ className = "h-6 w-6", variant = "frame" }: Props) {
  if (variant === "monogram") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
        <rect x="6" y="18" width="5" height="8" rx="1.5" fill="currentColor" />
        <rect x="13.5" y="12" width="5" height="14" rx="1.5" fill="currentColor" />
        <rect x="21" y="6" width="5" height="20" rx="1.5" style={{ fill: "var(--accent-color)" }} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <rect x="3" y="5" width="26" height="22" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M13 11.5v9l8-4.5-8-4.5Z" style={{ fill: "var(--accent-color)" }} />
    </svg>
  );
}
