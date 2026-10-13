import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import type { Player } from "@/lib/types";
import { attendance, chemistry, goalContext, headToHead, leaderboard, seasonPlayers, signed } from "@/lib/stats";
import { ArrowLink, LeaderList, PageHeader, Panel, PlayerLink, SectionTitle } from "@/components/ui";
import { PlayerTable, type PlayerRow } from "@/components/player-table";
import { StackedBySeason } from "@/components/charts";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";

export const metadata: Metadata = { title: "Stats", description: "Thameslink Hajduci statistics: leaderboards, the full player table, partnerships and head to head." };

const toRow = (p: Player): PlayerRow => { const d = p.wins + p.draws + p.losses; return { name: p.name, slug: p.slug, apps: p.apps, goals: p.goals, assists: p.assists, motm: p.motm, wins: p.wins, draws: p.draws, losses: p.losses, goalsPerGame: p.goalsPerGame, assistsPerGame: p.assistsPerGame, gpgGames: p.gpgGames, apgGames: p.apgGames, winRate: p.winRate, ppg: d ? +((p.wins * 3 + p.draws) / d).toFixed(2) : 0 }; };

export default async function StatsPage() {
  const data = await getData();
  const MIN = 10;
  const datasets: Record<string, PlayerRow[]> = { all: data.players.map(toRow) };
  for (const s of data.seasons) datasets[s.id] = seasonPlayers(data, s.id).map(toRow);
  const seasonIds = data.seasons.map((s) => s.id);
  const shortName = (n: string) => (n.length > 14 ? `${n[0]}. ${n.split(" ").slice(-1)[0]}` : n);
  const stack = (key: "goals" | "apps", n = 15) => [...data.players].sort((a, b) => b[key] - a[key] || b.apps - a.apps).filter((p) => p[key] > 0).slice(0, n).map((p) => ({ name: `${shortName(p.name)} · ${p[key]}`, ...Object.fromEntries(seasonIds.map((sid) => [sid, p.seasons.find((x) => x.seasonId === sid)?.[key] ?? 0])) }));
  const pairs = chemistry(data.matches, 5).slice(0, 12);
  const opponents = headToHead(data.matches);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const MIN_POSSIBLE = 15, MIN_GOALS = 5;
  const punctuality = data.players.map((p) => ({ player: p, a: attendance(data, p.name) })).filter((x) => x.a.possible >= MIN_POSSIBLE && x.a.apps > 0).map((x) => ({ player: x.player, value: x.a.pct })).sort((a, b) => b.value - a.value || b.player.apps - a.player.apps || a.player.name.localeCompare(b.player.name));
  const goalsInWins = data.players.filter((p) => p.goals >= MIN_GOALS).map((p) => ({ player: p, value: goalContext(data, p.name).inWins })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value || b.player.goals - a.player.goals || a.player.name.localeCompare(b.player.name));
    const notBeaten = opponents.filter((o) => o.played >= 5 && o.won === 0);
  const boards: { title: string; sub?: string; items: { player: Player; value: number }[]; color?: string; fmt?: (v: number) => string }[] = [
    { title: "Appearances", items: leaderboard(data.players, "apps").slice(0, 5), color: "bg-ink" },
    { title: "Goals", items: leaderboard(data.players, "goals").slice(0, 5) },
    { title: "Assists", items: leaderboard(data.players, "assists").slice(0, 5), color: "bg-assist" },
    { title: "Goals and assists", items: leaderboard(data.players, "ga").slice(0, 5), color: "bg-accent" },
    { title: "Man of the match", items: leaderboard(data.players, "motm").slice(0, 5), color: "bg-gold" },
    { title: "Goals a game", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "goalsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2) },
    { title: "Assists a game", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "assistsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2), color: "bg-assist" },
    { title: "Win rate", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "winRate", MIN).slice(0, 5), fmt: (v) => `${v.toFixed(1)}%`, color: "bg-accent" },
    { title: "Attendance", sub: `Share of possible matches played, at least ${MIN_POSSIBLE}`, items: punctuality.slice(0, 5), fmt: (v) => `${v}%`, color: "bg-ink" },
    { title: "Goals in wins", sub: `At least ${MIN_GOALS} goals`, items: goalsInWins.slice(0, 5), color: "bg-accent" },
  ];

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="In numbers" title="Statistics" sub="Leaderboards, the full player table, and who plays best together." right={<Link href="/data" className={btn("secondary", "xs")}>Download the data</Link>} />

      <section aria-labelledby="leaders">
        <SectionTitle id="leaders" sub="All time, top five">Leaderboards</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Boards without a qualifier keep an empty line in its place, so the lists in each row start level. */}
          {boards.map((b) => <Panel key={b.title} as="div" size="sm" title={b.title} sub={b.sub ?? "\u00a0"}><LeaderList items={b.items} color={b.color} format={b.fmt} /></Panel>)}
        </div>
      </section>

      <section aria-labelledby="table">
        <SectionTitle id="table" sub="Sort by any column, or pick a season">Every player</SectionTitle>
        <PlayerTable datasets={datasets} seasons={[...seasonIds].reverse()} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel as="div" title="Goals by season" sub="The top fifteen, by season"><StackedBySeason data={stack("goals")} seasons={seasonIds} /></Panel>
        <Panel as="div" title="Appearances by season" sub="The top fifteen, by season"><StackedBySeason data={stack("apps")} seasons={seasonIds} /></Panel>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel as="div" title="Partnerships" sub="Pairs with the most matches together" flush>
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full">
              <thead><tr><th>Pair</th><th className="num">Matches</th><th className="num">Won</th><th className="num">Goals a game</th></tr></thead>
              <tbody>{pairs.map((x) => <tr key={`${x.a}|${x.b}`}><td className="whitespace-normal"><span className="flex flex-col leading-tight sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1"><PlayerLink name={x.a} player={byName.get(x.a)} className="whitespace-nowrap" /><span className="hidden text-muted sm:inline">&amp;</span><PlayerLink name={x.b} player={byName.get(x.b)} className="whitespace-nowrap" /></span></td><td className="num">{x.shared}</td><td className="num font-semibold">{x.winRate}%</td><td className="num">{x.gpg}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-6 lg:flex lg:flex-col lg:space-y-0 lg:gap-6 lg:[&>*:last-child]:flex-1">
        <Panel as="div" title="Yet to beat" sub="Played five or more times without a win" right={<ArrowLink href="/opponents">All opponents</ArrowLink>}>
          {notBeaten.length ? (
            <ul className="space-y-2 text-sm">
              {notBeaten.map((o) => <li key={o.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 sm:flex sm:gap-3"><Link href={`/opponents/${o.slug}`} className="focus-ring min-w-0 truncate rounded font-medium text-ink transition-colors hover:text-accent" title={o.opponent}>{o.opponent}</Link><span className="tabular w-10 shrink-0 text-right text-xs font-semibold text-ink sm:order-last">{signed(o.gf - o.ga)}</span><span className="col-span-2 flex gap-3 text-xs text-muted sm:ml-auto sm:shrink-0"><span>{o.played} played</span><span className="tabular">drew {o.drawn}, lost {o.lost}</span></span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">Every team played five or more times has been beaten at least once.</p>}
        </Panel>
        <Panel as="div" title="Head to head" sub="Most played first" right={<ArrowLink href="/opponents">All opponents</ArrowLink>} flush>
          <div className="scroll-x overflow-x-auto sm:max-h-[560px] sm:overflow-auto">
            <table className="stats w-full">
              <thead><tr><th>Opponent</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GD</th><th className="hidden md:table-cell lg:hidden xl:table-cell">Seasons</th></tr></thead>
              <tbody>{opponents.map((o) => { const gd = o.gf - o.ga; return <tr key={o.key}><td className="font-medium text-ink"><Link href={`/opponents/${o.slug}`} className="link block max-w-[9rem] truncate lg:max-w-[11rem]" title={o.opponent}>{o.opponent}</Link></td><td className="num">{o.played}</td><td className="num">{o.won}</td><td className="num">{o.drawn}</td><td className="num">{o.lost}</td><td className="num">{signed(gd)}</td><td className="hidden whitespace-normal text-xs text-muted md:table-cell lg:hidden xl:table-cell">{o.seasons.join(" ")}</td></tr>; })}</tbody>
            </table>
          </div>
        </Panel>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
