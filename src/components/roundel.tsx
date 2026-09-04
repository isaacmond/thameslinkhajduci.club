import { opponentKey } from "@/lib/stats";

/** Stable 0–359 hue for an opponent: FNV-1a over the normalised name, so "Vauban FC" and "vauban" share a colour and the same team is the same colour on every visit. */
export function roundelHue(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of opponentKey(name)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % 360;
}
/** Ring colour with fixed saturation/lightness, so every hue reads on the #07130b surface. `alpha` for glows. */
export const roundelColor = (name: string, alpha = 1) => `hsl(${roundelHue(name)} 64% 60% / ${alpha})`;
/** Up to three initials for the bar: one per word ("Green of the South" → GOS), or the first three letters of a one-word name ("Spudos" → SPU). */
export function roundelInitials(name: string): string {
  const words = opponentKey(name).split(" ").filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 3) : words.slice(0, 3).map((w) => w[0]).join("")).toUpperCase();
}

/** Verdict shared by the opponents index and each opponent page. Bogey status trumps everything. */
export function opponentVerdict(o: { played: number; won: number; lost: number }): { word: string; tone: "loss" | "mint" | "gold" } | null {
  if (o.played >= 5 && o.won === 0) return { word: "Bogey team", tone: "loss" };
  if (o.played >= 3 && o.lost === 0) return { word: "Easy street", tone: "mint" };
  if (o.played >= 8) return { word: "Rivals", tone: "gold" };
  return null;
}

/** Destination roundel for an opponent: a coloured ring cut by a bar carrying their initials. Pure SVG, server-renderable, same name always the same colour. */
export function Roundel({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const hue = roundelHue(name);
  const ring = `hsl(${hue} 64% 60%)`, bar = `hsl(${hue} 50% 21%)`;
  const text = roundelInitials(name);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={`${name} roundel`} style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r="36" fill="none" stroke={ring} strokeWidth="14" />
      <rect x="0" y="39" width="100" height="22" rx="2" fill={bar} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <text x="50" y="50.5" textAnchor="middle" dominantBaseline="central" fontSize={text.length >= 3 ? 17 : 18} letterSpacing="1.5" fill="#f6f1e6" style={{ fontFamily: "var(--font-display)" }}>{text}</text>
    </svg>
  );
}
