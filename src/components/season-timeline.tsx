import Link from "next/link";
import clsx from "clsx";
import type { Match, Season } from "@/lib/types";
import { chronological, fmtDate, gwLabel, scoreline } from "@/lib/stats";
import { ScrollToStop } from "./scroll-to-stop";
import { ROUND } from "./ui";

const STEP = 76; // px per fixture: fixed, so the row scrolls sideways on phones instead of squashing
const STOP = 28; // the stop's diameter (ROUND.md); each connector runs from one stop's edge to the next

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
      <ol className="flex w-max py-2">
        {fixtures.map((m, i) => {
          const kind = kindOf(m, nextId, today);
          return (
            <li key={m.id} style={{ width: STEP }} className="shrink-0">
              <Link href={`/matches/${m.id}`} aria-label={describe(m, kind)} className="focus-ring group flex flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-center">
                <span className="eyebrow eyebrow-sm">{gwLabel(m)}</span>
                <span className={clsx("pill-round relative", ROUND.md,
                  kind === "played" ? `result-${m.result ?? "X"}` : kind === "next" ? "border-accent bg-accent text-paper" : kind === "pending" ? "border-dashed border-ink/25 bg-surface text-muted" : "border-ink/15 bg-surface text-muted")}>
                  {kind === "played" ? (m.result ?? "·") : kind === "next" ? "•" : ""}
                  {i < fixtures.length - 1 && <span className="absolute left-[calc(100%+1px)] top-1/2 h-px -translate-y-1/2 bg-ink/12" style={{ width: STEP - STOP }} aria-hidden />}
                </span>
                <span className={clsx("tabular text-xs", kind === "played" ? "font-semibold text-ink" : kind === "next" ? "font-semibold text-accent" : "text-muted")}>{kind === "played" ? scoreline(m) : kind === "next" ? "Next" : m.date ? fmtDate(m.date, { day: "numeric", month: "short" }) : "TBC"}</span>
                <span className="line-clamp-2 min-h-[2lh] w-full whitespace-normal break-words text-2xs leading-tight text-muted transition-colors group-hover:text-ink" title={m.opponent}>{m.opponent}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
