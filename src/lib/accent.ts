/** Accent colors must stay readable on the pure black base (WCAG 4.5:1). */
const MIN_LUMINANCE = 0.175;

function channel(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const rgb = parse(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isTooDark(hex: string): boolean {
  return luminance(hex) < MIN_LUMINANCE;
}

/** Lighten toward white just enough to be readable on black. */
export function readableAccent(hex: string): string {
  const rgb = parse(hex);
  if (!rgb || !isTooDark(hex)) return hex;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = rgb.map((c) => Math.round(c + (255 - c) * t));
    const out = "#" + mixed.map((c) => c.toString(16).padStart(2, "0")).join("");
    if (!isTooDark(out)) return out;
  }
  return "#ffffff";
}
