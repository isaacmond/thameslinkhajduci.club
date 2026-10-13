import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import type { Player } from "@/lib/types";
import { attendance, chemistry, goalContext, headToHead, leaderboard, seasonPlayers, signed } from "@/lib/stats";
import { LeaderList, PageHeader, PlayerLink, SectionTitle } from "@/components/ui";
import { PlayerTable, type PlayerRow } from "@/components/player-table";
import { StackedBySeason } from "@/components/charts";
import { PageTransition } from "@/components/page-transition";

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
    const boards: { title: string; sub?: string; items: { player: Player; value: number }[]; color?: string; fmt?: (v: number) => string }[] = [
    { title: "Appearances", items: leaderboard(data.players, "apps").slice(0, 5), color: "bg-ink" },
    { title: "Goals", items: leaderboard(data.players, "goals").slice(0, 5) },
    { title: "Assists", items: leaderboard(data.players, "assists").slice(0, 5), color: "bg-assist" },
    { title: "Goals and assists", items: leaderboard(data.players, "ga").slice(0, 5), color: "bg-gold" },
    { title: "Man of the match", items: leaderboard(data.players, "motm").slice(0, 5), color: "bg-gold" },
    { title: "Goals a game", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "goalsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2) },
    { title: "Assists a game", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "assistsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2), color: "bg-assist" },
    { title: "Win rate", sub: `At least ${MIN} matches`, items: leaderboard(data.players, "winRate", MIN).slice(0, 5), fmt: (v) => `${v}%`, color: "bg-accent" },
    { title: "Attendance", sub: `Share of possible matches played, at least ${MIN_POSSIBLE}`, items: punctuality.slice(0, 5), fmt: (v) => `${v}%`, color: "bg-ink" },
    { title: "Goals in wins", sub: `At least ${MIN_GOALS} goals`, items: goalsInWins.slice(0, 5), color: "bg-accent" },
  ];

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="In numbers" title="Statistics" sub="Leaderboards, the full player table, and who plays best together." right={<Link href="/data" className="focus-ring chip text-muted hover:text-ink">Download the data</Link>} />

      <section aria-labelledby="leaders">
        <SectionTitle id="leaders" sub="All time, top five">Leaderboards</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((b) => <div key={b.title} className="card p-5"><h3 className="display text-2xl leading-none text-ink">{b.title}</h3><p className="mt-1 min-h-4 text-xs text-muted">{b.sub}</p><div className="mt-3"><LeaderList items={b.items} color={b.color} format={b.fmt} /></div></div>)}
        </div>
      </section>

      <section aria-labelledby="table">
        <SectionTitle id="table" sub="Sort by any column, or pick a season">Every player</SectionTitle>
        <PlayerTable datasets={datasets} seasons={[...seasonIds].reverse()} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6"><SectionTitle sub="The top fifteen, by season">Goals by season</SectionTitle><StackedBySeason data={stack("goals")} seasons={seasonIds} /></div>
        <div className="card p-6"><SectionTitle sub="The top fifteen, by season">Appearances by season</SectionTitle><StackedBySeason data={stack("apps")} seasons={seasonIds} /></div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card overflow-hidden">
          <div className="p-6 pb-2"><SectionTitle sub="Pairs with the most matches together">Partnerships</SectionTitle></div>
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full">
              <thead><tr><th>Pair</th><th className="num">Matches</th><th className="num">Won</th><th className="num">Goals a game</th></tr></thead>
              <tbody>{pairs.map((x) => <tr key={`${x.a}|${x.b}`}><td className="!whitespace-normal min-w-[10rem]"><span className="flex flex-col leading-tight sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1"><PlayerLink name={x.a} player={byName.get(x.a)} className="whitespace-nowrap" /><span className="hidden text-muted sm:inline">&amp;</span><PlayerLink name={x.b} player={byName.get(x.b)} className="whitespace-nowrap" /></span></td><td className="num">{x.shared}</td><td className="num font-semibold">{x.winRate}%</td><td className="num">{x.gpg}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="p-6 pb-2"><SectionTitle right={<Link href="/opponents" className="link text-sm">All opponents</Link>} sub="Most played first">Head to head</SectionTitle></div>
          <div className="scroll-x overflow-x-auto sm:max-h-[560px] sm:overflow-auto">
            <table className="stats w-full">
              <thead><tr><th>Opponent</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GD</th></tr></thead>
              <tbody>{opponents.map((o) => { const gd = o.gf - o.ga; return <tr key={o.key}><td className="font-medium text-ink"><Link href={`/opponents/${o.slug}`} className="link block max-w-[9rem] truncate lg:max-w-[14rem]" title={o.opponent}>{o.opponent}</Link></td><td className="num">{o.played}</td><td className="num">{o.won}</td><td className="num">{o.drawn}</td><td className="num">{o.lost}</td><td className="num">{signed(gd)}</td></tr>; })}</tbody>
            </table>
          </div>
        </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
