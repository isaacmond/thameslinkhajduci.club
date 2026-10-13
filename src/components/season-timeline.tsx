import Link from "next/link";
import clsx from "clsx";
import type { Match, Season } from "@/lib/types";
import { chronological, fmtDate, gwLabel, scoreline } from "@/lib/stats";
import { ScrollToStop } from "./scroll-to-stop";

const STEP = 76; // px per fixture: fixed, so the row scrolls sideways on phones instead of squashing

type Kind = "played" | "next" | "future" | "pending";
const kindOf = (m: Match, nextId: string | null, today: string): Kind => (m.played ? "played" : m.id === nextId ? "next" : m.date && m.date < today ? "pending" : "future");
const describe = (m: Match, kind: Kind) => {
  const when = fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const outcome = kind === "played" ? `${scoreline(m)}, ${m.result === "W" ? "win" : m.result === "D" ? "draw" : m.result === "L" ? "loss" : "played"}` : kind === "next" ? "next match" : kind === "pending" ? "result to come" : "to play";
  return `${gwLabel(m)} v ${m.opponent}, ${when}: ${outcome}${m.type ? ` (${m.type.toLowerCase()})` : ""}`;
};

/** The season at a glance: every fixture in order, results filled in, the next one ringed. Scrolls sideways when it doesn't fit. */
export function SeasonTimeline({ season, today }: { season: Season; today: string }) {
  const fixtures = chronological(season.matches);
  if (!fixtures.length) return <p className="py-6 text-center text-sm text-muted">No fixtures yet.</p>;
  const nextId = fixtures.find((m) => !m.played && m.date !== null && m.date >= today)?.id ?? null;
  const nextIdx = nextId ? fixtures.findIndex((m) => m.id === nextId) : -1;
  return (
    <div className="scroll-x focus-ring overflow-x-auto" tabIndex={0} role="region" aria-label="Season timeline, scrolls sideways">
      {nextIdx >= 0 && <ScrollToStop x={nextIdx * STEP + STEP / 2} />}
      <ol className="relative flex py-2" style={{ minWidth: fixtures.length * STEP }}>
        <span className="absolute inset-x-[38px] top-[2.6rem] h-px bg-ink/12" aria-hidden />
        {fixtures.map((m) => {
          const kind = kindOf(m, nextId, today);
          return (
            <li key={m.id} style={{ width: STEP }} className="shrink-0">
              <Link href={`/matches/${m.id}`} aria-label={describe(m, kind)} className="focus-ring group flex flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-center">
                <span className="eyebrow eyebrow-sm">{gwLabel(m)}</span>
                <span className={clsx("relative flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold",
                  kind === "played" ? `result-${m.result ?? "X"}` : kind === "next" ? "border-accent bg-accent text-paper" : kind === "pending" ? "border-dashed border-ink/25 bg-surface text-muted" : "border-ink/15 bg-surface text-muted")}>
                  {kind === "played" ? (m.result ?? "·") : kind === "next" ? "•" : ""}
                </span>
                <span className={clsx("tabular text-xs", kind === "played" ? "font-semibold text-ink" : kind === "next" ? "font-semibold text-accent" : "text-muted")}>{kind === "played" ? scoreline(m) : kind === "next" ? "Next" : m.date ? fmtDate(m.date, { day: "numeric", month: "short" }) : "TBC"}</span>
                <span className="line-clamp-2 min-h-[2lh] w-full whitespace-normal break-words text-[11px] leading-tight text-muted transition-colors group-hover:text-ink" title={m.opponent}>{m.opponent}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
