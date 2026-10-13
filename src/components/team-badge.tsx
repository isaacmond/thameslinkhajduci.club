import { opponentKey } from "@/lib/stats";

/** Stable 0–359 hue for an opponent: FNV-1a over the normalised name, so "Vauban FC" and "vauban" share a colour on every visit. */
export function badgeHue(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of opponentKey(name)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % 360;
}
/** The opponent's colour, tuned for the current theme. */
export const badgeColor = (name: string) => { const h = badgeHue(name); return `light-dark(hsl(${h} 38% 38%), hsl(${h} 45% 70%))`; };
/** Up to three initials: one per word ("Green of the South" → GOS), or the first three letters of a one-word name ("Spudos" → SPU). */
export function badgeInitials(name: string): string {
  const words = opponentKey(name).split(" ").filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 3) : words.slice(0, 3).map((w) => w[0]).join("")).toUpperCase();
}

/** A short description of the head-to-head, shared by the opponents index and each opponent page. */
export function opponentVerdict(o: { played: number; won: number; lost: number }): { word: string; tone: "loss" | "mint" | "gold" } | null {
  if (o.played >= 5 && o.won === 0) return { word: "Yet to beat", tone: "loss" };
  if (o.played >= 3 && o.lost === 0) return { word: "Unbeaten against", tone: "mint" };
  if (o.played >= 8) return { word: "Regular opponent", tone: "gold" };
  return null;
}

/** An opponent's badge: their initials in a tinted circle. Pure SVG, server-renderable, the same name always the same colour. */
export function TeamBadge({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const h = badgeHue(name);
  const text = badgeInitials(name);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={name} style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r="48" style={{ fill: `light-dark(hsl(${h} 40% 92%), hsl(${h} 22% 20%))`, stroke: `light-dark(hsl(${h} 30% 78%), hsl(${h} 25% 32%))` }} strokeWidth="2" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fontSize={text.length >= 3 ? 30 : 34} fontWeight={600} letterSpacing="1" style={{ fill: `light-dark(hsl(${h} 42% 30%), hsl(${h} 45% 78%))`, fontFamily: "var(--font-sans)" }}>{text}</text>
    </svg>
  );
}
