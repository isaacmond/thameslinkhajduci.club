import Link from "next/link";
import clsx from "clsx";
import type { ClubData, Match, Player } from "@/lib/types";
import { form, preview } from "@/lib/stats";
import { FormStrip, LeaderList, SectionTitle } from "@/components/ui";

/** Goals per Hajduci player across the counted meetings with one opponent, most first. Only players still in the records get a row. */
function scorersAgainst(matches: Match[], players: Player[], top = 3): { player: Player; value: number }[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const goals = new Map<string, number>();
  for (const m of matches) for (const l of m.lineup) if (l.goals > 0) goals.set(l.player, (goals.get(l.player) ?? 0) + l.goals);
  return [...goals.entries()]
    .flatMap(([name, value]) => { const player = byName.get(name); return player ? [{ player, value }] : []; })
    .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name))
    .slice(0, top);
}

const outcomes = [
  { key: "win", label: "On time", hint: "Win", bar: "bg-win", text: "text-mint-soft" },
  { key: "draw", label: "Delayed", hint: "Draw", bar: "bg-draw", text: "text-[#ffe27a]" },
  { key: "loss", label: "Cancelled", hint: "Loss", bar: "bg-loss", text: "text-[#ff9a9d]" },
] as const;

/** Pre-match forecast for an unplayed fixture: outcome odds in the house dialect, expected goals, form, and what history says about this opponent. */
export function MatchPreview({ data, match }: { data: ClubData; match: Match }) {
  const p = preview(data, match);
  const recent = form(data.matches, 5);
  const h2h = p.h2h;
  const lead = outcomes.reduce((best, o) => (p[o.key] > p[best.key] ? o : best), outcomes[0]);
  const scorers = h2h ? scorersAgainst(h2h.matches, data.players) : [];
  const sub = p.sample === 0 ? "Based on no games at all, so treat it as a mood" : `Based on the last ${p.sample} counted game${p.sample === 1 ? "" : "s"}${h2h && h2h.played >= 2 ? ", nudged by past meetings" : ""}`;

  return (
    <div className="card p-5">
      <SectionTitle sub={sub}>Forecast</SectionTitle>
      <p className="mb-4 text-sm text-cream/90">Most likely service status: <span className={clsx("board-glow font-mono uppercase tracking-[0.2em]", lead.text)}>{lead.label}</span><span className="text-ash"> ({p[lead.key]}%)</span></p>

      <ul className="space-y-3" aria-label="Outcome probabilities">
        {outcomes.map((o) => {
          const v = p[o.key];
          return (
            <li key={o.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="eyebrow">{o.label} <span className="normal-case tracking-normal text-ash/60">· {o.hint}</span></span>
                <span className={clsx("display tabular text-2xl leading-none", o.text)}>{v}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={`${o.hint}: ${v}%`}>
                <div className={clsx("h-full rounded-full", o.bar)} style={{ width: `${Math.max(v, 1)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div className="flex flex-col-reverse rounded-lg bg-white/[0.03] px-2 py-3"><dt className="eyebrow mt-1">Expected for</dt><dd className="display tabular text-3xl leading-none text-mint-soft">{p.expectedFor.toFixed(1)}</dd></div>
        <div className="flex flex-col-reverse rounded-lg bg-white/[0.03] px-2 py-3"><dt className="eyebrow mt-1">Expected against</dt><dd className="display tabular text-3xl leading-none text-[#ff9a9d]">{p.expectedAgainst.toFixed(1)}</dd></div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">Current form</span>
        <FormStrip matches={recent} size="sm" />
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-sm">
        <p className="eyebrow">Against {h2h?.opponent ?? match.opponent}</p>
        {h2h ? (
          <p className="mt-1 text-cream/90">
            {h2h.played} meeting{h2h.played === 1 ? "" : "s"}: <span className="text-mint-soft">W{h2h.won}</span> <span className="text-[#ffe27a]">D{h2h.drawn}</span> <span className="text-[#ff9a9d]">L{h2h.lost}</span>, goals <span className="tabular">{h2h.gf}–{h2h.ga}</span>.{" "}
            <Link href={`/opponents/${h2h.slug}`} className="link whitespace-nowrap">Full history →</Link>
          </p>
        ) : (
          <p className="mt-1 text-cream/90">First meeting. No history, no baggage, no excuses prepared.</p>
        )}
        {scorers.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-ash">Who has scored against them</p>
            <LeaderList items={scorers} />
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ash/70">Forecast produced by a Poisson distribution and misplaced optimism.</p>
    </div>
  );
}
