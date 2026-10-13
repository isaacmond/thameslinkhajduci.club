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
  { key: "win", label: "Win", bar: "bg-win" },
  { key: "draw", label: "Draw", bar: "bg-draw" },
  { key: "loss", label: "Defeat", bar: "bg-loss" },
] as const;

/** Pre-match forecast for an unplayed fixture: outcome odds, expected goals, form, and what history says about this opponent. */
export function MatchPreview({ data, match }: { data: ClubData; match: Match }) {
  const p = preview(data, match);
  const recent = form(data.matches, 5);
  const h2h = p.h2h;
  const scorers = h2h ? scorersAgainst(h2h.matches, data.players) : [];
  const sub = p.sample === 0 ? "No previous matches to go on yet" : `Based on the last ${p.sample} match${p.sample === 1 ? "" : "es"}${h2h && h2h.played >= 2 ? " and past meetings" : ""}`;

  return (
    <div className="card p-6">
      <SectionTitle sub={sub}>Forecast</SectionTitle>

      <ul className="space-y-3" aria-label="Outcome probabilities">
        {outcomes.map((o) => {
          const v = p[o.key];
          return (
            <li key={o.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="eyebrow">{o.label}</span>
                <span className="display text-2xl leading-none text-ink">{v}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/[0.06]" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={`${o.label}: ${v}%`}>
                <div className={clsx("h-full rounded-full", o.bar)} style={{ width: `${Math.max(v, 1)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-sunken/60 px-2 py-3"><dt className="eyebrow">xG for</dt><dd className="display mt-1.5 text-3xl leading-none text-ink">{p.expectedFor.toFixed(1)}</dd></div>
        <div className="rounded-lg bg-sunken/60 px-2 py-3"><dt className="eyebrow">xG against</dt><dd className="display mt-1.5 text-3xl leading-none text-ink">{p.expectedAgainst.toFixed(1)}</dd></div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">Current form</span>
        <FormStrip matches={recent} size="sm" />
      </div>

      <div className="mt-5 border-t border-ink/10 pt-4 text-sm">
        <p className="eyebrow">Against {h2h?.opponent ?? match.opponent}</p>
        {h2h ? (
          <p className="mt-1 text-ink/90">
            {h2h.played} meeting{h2h.played === 1 ? "" : "s"}: won {h2h.won}, drew {h2h.drawn}, lost {h2h.lost}, goals <span className="tabular">{h2h.gf}–{h2h.ga}</span>.{" "}
            <Link href={`/opponents/${h2h.slug}`} className="link whitespace-nowrap">Full history</Link>
          </p>
        ) : (
          <p className="mt-1 text-ink/90">This will be the first meeting.</p>
        )}
        {scorers.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">Top scorers against them</p>
            <LeaderList items={scorers} />
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">A Poisson model of recent scoring rates.</p>
    </div>
  );
}
