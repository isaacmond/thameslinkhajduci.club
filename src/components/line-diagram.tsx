import Link from "next/link";
import clsx from "clsx";
import type { Match, Season } from "@/lib/types";
import { chronological, fmtDate, gwLabel, scoreline } from "@/lib/stats";
import { ScrollToStop } from "./scroll-to-stop";

/* Result colours match C.win / C.draw / C.loss in charts.tsx. That file is a client module, so the values are repeated here rather than imported into a server component. */
const FILL = { W: "#22a852", D: "#c4871a", L: "#d9484e", none: "#a7b8ab" } as const;
const MINT = "var(--color-mint)";
const NIGHT = "var(--color-night)";

const STEP = 96; // px per station: fixed so the line scrolls sideways on phones instead of squashing
const PAD = 56;
const H = 136;
const MID = 68;
const R = 9;

type Kind = "played" | "here" | "future" | "pending";
const trunc = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const kindOf = (m: Match, hereId: string | null, today: string): Kind => (m.played ? "played" : m.id === hereId ? "here" : m.date && m.date < today ? "pending" : "future");
const describe = (m: Match, kind: Kind) => {
  const when = fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const outcome = kind === "played" ? `${scoreline(m)}, ${m.result === "W" ? "win" : m.result === "D" ? "draw" : m.result === "L" ? "loss" : "no result"}` : kind === "here" ? "next up" : kind === "pending" ? "result pending" : "to play";
  return `${gwLabel(m)} v ${m.opponent}, ${when}: ${outcome}${m.type ? ` (${m.type.toLowerCase()})` : ""}. Open match page`;
};

/** A tube-line map of one season's fixtures, oldest first. Filled stations are results, the pulsing ring is the next fixture, hollow ones are still to play. */
export function LineDiagram({ season, today }: { season: Season; today: string }) {
  const fixtures = chronological(season.matches);
  if (!fixtures.length) return <p className="py-6 text-center text-sm text-ash">No fixtures on the board yet. The line is under construction.</p>;
  const hereId = fixtures.find((m) => !m.played && m.date !== null && m.date >= today)?.id ?? null;
  const xs = fixtures.map((_, i) => PAD + i * STEP);
  const width = PAD * 2 + (fixtures.length - 1) * STEP;
  const hereIdx = hereId ? fixtures.findIndex((m) => m.id === hereId) : -1;
  // The travelled part of the line is solid; everything beyond the next stop is faded, like a section not yet open.
  const splitX = hereIdx >= 0 ? xs[hereIdx] : xs[xs.length - 1];
  const hasFuture = hereIdx >= 0 && hereIdx < fixtures.length - 1;
  const hasPast = hereIdx !== 0;
  const kinds = new Set(fixtures.map((m) => kindOf(m, hereId, today)));
  const results = new Set(fixtures.filter((m) => m.played).map((m) => m.result ?? "none"));

  return (
    <div>
      <div className="scroll-x focus-ring overflow-x-auto" tabIndex={0} role="region" aria-label="Line map, scrolls sideways">
        {hereIdx >= 0 && <ScrollToStop x={xs[hereIdx]} />}
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="mx-auto block" style={{ minWidth: width }} aria-label={`${season.id === "FR" ? "Friendlies" : `Season ${season.number}`} line map: ${fixtures.length} stops`}>
          {fixtures.length > 1 && hasPast && <line x1={xs[0]} y1={MID} x2={splitX} y2={MID} stroke={MINT} strokeWidth={8} strokeLinecap="round" />}
          {fixtures.length > 1 && hasFuture && <line x1={splitX} y1={MID} x2={xs[xs.length - 1]} y2={MID} stroke={MINT} strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" />}
          {fixtures.map((m, i) => {
            const x = xs[i];
            const kind = kindOf(m, hereId, today);
            const above = i % 2 === 0;
            const [y1, y2] = above ? [30, 44] : [100, 114];
            const captionY = above ? 104 : 40;
            const detail = m.played ? scoreline(m) : m.date ? fmtDate(m.date, { day: "numeric", month: "short" }) : "TBC";
            return (
              <Link key={m.id} href={`/matches/${m.id}`} aria-label={describe(m, kind)} className="focus-ring group rounded-lg">
                <rect x={x - STEP / 2} y={0} width={STEP} height={H} fill="transparent" />
                {kind === "here" && <circle cx={x} cy={MID} r={R + 7} fill="none" stroke={MINT} strokeWidth={2} className="animate-pulse-soft" />}
                {kind === "played" ? (
                  <circle cx={x} cy={MID} r={R} fill={FILL[m.result ?? "none"]} stroke={NIGHT} strokeWidth={2} />
                ) : (
                  <circle cx={x} cy={MID} r={R} fill={NIGHT} stroke={kind === "pending" ? FILL.none : MINT} strokeWidth={3} strokeDasharray={kind === "pending" ? "3 3" : undefined} className={clsx(kind === "future" && "opacity-70 transition-opacity group-hover:opacity-100")} />
                )}
                <text x={x} y={y1} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-cream">{gwLabel(m)} · {detail}</text>
                <text x={x} y={y2} textAnchor="middle" fontSize={10} className="fill-ash transition-colors group-hover:fill-cream">{trunc(m.opponent)}</text>
                {kind === "here" && <text x={x} y={captionY} textAnchor="middle" fontSize={8.5} fontWeight={700} letterSpacing="0.14em" className="fill-mint-soft">YOU ARE HERE</text>}
              </Link>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ash" aria-hidden>
        {results.has("W") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.W }} />Win</span>}
        {results.has("D") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.D }} />Draw</span>}
        {results.has("L") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.L }} />Loss</span>}
        {results.has("none") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FILL.none }} />Played, no result</span>}
        {kinds.has("here") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 animate-pulse-soft rounded-full border-2 border-mint" />Next stop</span>}
        {kinds.has("future") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-mint/60" />To play</span>}
        {kinds.has("pending") && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-ash" />No result logged</span>}
      </p>
    </div>
  );
}
