import * as React from "react";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  showAccent?: boolean;
  underline?: boolean;
};

/**
 * Typographic wordmark. Uses Syne (loaded in __root.tsx) via font-display.
 * The dot on the "i" is replaced with an accent-colored square; an optional
 * underline tick under "Track" adds a second accent beat.
 */
export function LogoWordmark({ showAccent = true, underline = false, className, ...props }: Props) {
  return (
    <span
      className={`font-display inline-flex items-baseline text-current ${className ?? ""}`}
      style={{ letterSpacing: "-0.03em", fontWeight: 700, lineHeight: 1 }}
      {...props}
    >
      <span>an</span>
      {/* Custom "i" — dotless glyph + accent square dot */}
      <span className="relative inline-block" aria-hidden="true">
        <span style={{ visibility: "hidden" }}>i</span>
        <span
          className="absolute left-0 right-0"
          style={{
            bottom: "0.05em",
            height: "0.65em",
            borderLeft: "0.11em solid currentColor",
            marginLeft: "0.16em",
          }}
        />
        {showAccent && (
          <span
            className="absolute"
            style={{
              top: "-0.02em",
              left: "0.08em",
              width: "0.24em",
              height: "0.24em",
              background: "var(--accent-color)",
            }}
          />
        )}
      </span>
      <span className="relative">
        Track
        {showAccent && underline && (
          <span
            className="absolute left-0 right-0"
            style={{ bottom: "-0.15em", height: "0.08em", background: "var(--accent-color)" }}
          />
        )}
      </span>
    </span>
  );
}
