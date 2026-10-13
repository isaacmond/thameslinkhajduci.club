import clsx from "clsx";
import type { Match } from "@/lib/types";
import { gwLabel, scoreline, signed } from "@/lib/stats";

/* The site-wide result colours, from the theme tokens. Kept here so this stays a server component and the opponent page ships no chart library for a handful of bars. */
const FILL = { W: "var(--color-win)", D: "var(--color-draw)", L: "var(--color-loss)" } as const;
const TEXT = { W: "text-win", D: "text-draw", L: "text-loss" } as const;
const H = 100; // viewBox height units; the drawn height is fixed in CSS, so the chart never squashes on phones
const PAD = 6; // headroom above the tallest bar and below the deepest one
const TICK = 2; // draw marker height, in units
const SLOT = 120; // max rendered px per meeting, so two bars do not balloon across a wide card

type Kind = keyof typeof FILL;
const gdOf = (m: Match) => (m.ourGoals ?? 0) - (m.theirGoals ?? 0);
const kindOf = (gd: number): Kind => (gd > 0 ? "W" : gd < 0 ? "L" : "D");
/** "+3", "−2" (a real minus sign, which screen readers voice) or "0". */

/** One bar per counted meeting, oldest first: up in green for wins, down in red for defeats, a tick on the baseline for draws. Inline SVG stretched to the card (preserveAspectRatio none), with the numbers and labels in HTML underneath so they never scale down with it. */
export function GoalDiffBars({ matches, opponent }: { matches: Match[]; opponent: string }) {
  const n = matches.length;
  if (!n) return null;
  const gds = matches.map(gdOf);
  const up = Math.max(0, ...gds), down = Math.max(0, ...gds.map((g) => -g));
  const unit = (H - PAD * 2) / Math.max(1, up + down);
  const base = up + down ? PAD + up * unit : H / 2;
  const showLabels = n <= 8;
  const won = gds.filter((g) => g > 0).length, lost = gds.filter((g) => g < 0).length, drawn = n - won - lost;
  const results = new Set(gds.map(kindOf));
  const summary = `Goal difference in ${n} meetings with ${opponent}, won ${won}, drew ${drawn}, lost ${lost}: ${matches.map((m, i) => `${m.seasonId} ${gwLabel(m)} ${signed(gds[i])}`).join(", ")}`;

  return (
    <div className="mx-auto" style={{ maxWidth: n * SLOT }}>
      <svg viewBox={`0 0 ${n} ${H}`} preserveAspectRatio="none" className="block h-40 w-full" role="img" aria-label={summary}>
        <line x1={0} y1={base} x2={n} y2={base} stroke="color-mix(in srgb, var(--color-ink) 20%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {matches.map((m, i) => {
          const gd = gds[i], kind = kindOf(gd), h = Math.abs(gd) * unit;
          return (
            <g key={m.id} className="transition-opacity hover:opacity-80">
              <title>{`${m.seasonId} ${gwLabel(m)} · ${scoreline(m)} v ${m.opponent} · ${signed(gd)}`}</title>
              <rect x={i} y={0} width={1} height={H} fill="transparent" />
              {kind === "D" ? (
                <rect x={i + 0.25} y={base - TICK / 2} width={0.5} height={TICK} fill={FILL.D} />
              ) : (
                <rect x={i + 0.25} y={kind === "W" ? base - h : base} width={0.5} height={h} fill={FILL[kind]} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 grid text-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
        {matches.map((m, i) => {
          const kind = kindOf(gds[i]);
          return (
            <div key={m.id} className="min-w-0 px-0.5">
              <span className={clsx("tabular block text-xs font-semibold leading-none", TEXT[kind])}>{signed(gds[i])}</span>
              {showLabels && <span className="mt-0.5 block text-[10px] leading-tight text-muted">{m.seasonId} {gwLabel(m)}</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted" aria-hidden>
        {results.has("W") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.W }} />Win</span>}
        {results.has("D") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.D }} />Draw</span>}
        {results.has("L") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.L }} />Loss</span>}
      </p>
    </div>
  );
}
