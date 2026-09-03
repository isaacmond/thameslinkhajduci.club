import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { getData } from "@/lib/data";
import type { Player } from "@/lib/types";
import { chemistry, headToHead, leaderboard, seasonPlayers, signed } from "@/lib/stats";
import { LeaderList, PageHeader, PlayerLink, SectionTitle } from "@/components/ui";
import { PlayerTable, type PlayerRow } from "@/components/player-table";
import { StackedBySeason } from "@/components/charts";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Stats", description: "Leaderboards, sortable player tables, partnerships and head-to-head records for Thameslink Hajduci." };

const toRow = (p: Player): PlayerRow => { const d = p.wins + p.draws + p.losses; return { name: p.name, slug: p.slug, apps: p.apps, goals: p.goals, assists: p.assists, motm: p.motm, champagne: p.champagne, wins: p.wins, draws: p.draws, losses: p.losses, goalsPerGame: p.goalsPerGame, assistsPerGame: p.assistsPerGame, gpgGames: p.gpgGames, apgGames: p.apgGames, winRate: p.winRate, ppg: d ? +((p.wins * 3 + p.draws) / d).toFixed(2) : 0 }; };

export default async function StatsPage() {
  const data = await getData();
  const MIN = 10;
  const datasets: Record<string, PlayerRow[]> = { all: data.players.map(toRow) };
  for (const s of data.seasons) datasets[s.id] = seasonPlayers(data, s.id).map(toRow);
  const seasonIds = data.seasons.map((s) => s.id);
  const stack = (key: "goals" | "apps", n = 15) => [...data.players].sort((a, b) => b[key] - a[key] || b.apps - a.apps).filter((p) => p[key] > 0).slice(0, n).map((p) => ({ name: `${p.name} · ${p[key]}`, ...Object.fromEntries(seasonIds.map((sid) => [sid, p.seasons.find((x) => x.seasonId === sid)?.[key] ?? 0])) }));
  const pairs = chemistry(data.matches, 5).slice(0, 12);
  const opponents = headToHead(data.matches);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const boards: { title: string; sub?: string; items: { player: Player; value: number }[]; color?: string; fmt?: (v: number) => string }[] = [
    { title: "Season ticket holders", sub: "Appearances", items: leaderboard(data.players, "apps").slice(0, 5), color: "bg-cream" },
    { title: "Golden boot", sub: "Goals", items: leaderboard(data.players, "goals").slice(0, 5) },
    { title: "Assists", sub: "Self-reported", items: leaderboard(data.players, "assists").slice(0, 5), color: "bg-[#4a8fe0]" },
    { title: "Goal involvements", sub: "Goals + assists", items: leaderboard(data.players, "ga").slice(0, 5), color: "bg-gold" },
    { title: "Man of the match", items: leaderboard(data.players, "motm").slice(0, 5), color: "bg-gold" },
    { title: "Champagne moments", sub: "The wall of shame", items: leaderboard(data.players, "champagne").slice(0, 5), color: "bg-[#e5484d]" },
    { title: "Goals per game", sub: `Min ${MIN} games with scorers logged`, items: leaderboard(data.players, "goalsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2) },
    { title: "Assists per game", sub: `Min ${MIN} games with assists logged`, items: leaderboard(data.players, "assistsPerGame", MIN).slice(0, 5), fmt: (v) => v.toFixed(2), color: "bg-[#4a8fe0]" },
    { title: "Win rate", sub: `Min ${MIN} apps`, items: leaderboard(data.players, "winRate", MIN).slice(0, 5), fmt: (v) => `${v}%`, color: "bg-mint" },
  ];

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Numbers" title="Stats" sub="Every number we could compute, and several we probably shouldn't have. Friendlies and forfeits excluded throughout." right={<Link href="/data" className="focus-ring chip text-ash hover:text-cream">Export any of this →</Link>} />

      <section aria-labelledby="leaders">
        <SectionTitle id="leaders" sub="Top five in each category, all-time">Leaderboards</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((b) => <div key={b.title} className="card p-4"><h3 className="display text-xl text-cream">{b.title}</h3>{b.sub && <p className="mb-2 text-xs text-ash">{b.sub}</p>}<div className="mt-2"><LeaderList items={b.items} color={b.color} format={b.fmt} /></div></div>)}
        </div>
      </section>

      <section aria-labelledby="table">
        <SectionTitle id="table" sub="Click a column to sort. Switch scope to see a single season.">The big table</SectionTitle>
        <PlayerTable datasets={datasets} seasons={[...seasonIds].reverse()} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card p-5"><SectionTitle sub="Top 15 scorers, split by season (oldest season darkest)">Goals by season</SectionTitle><StackedBySeason data={stack("goals")} seasons={seasonIds} /></div>
        <div className="card p-5"><SectionTitle sub="Top 15 by appearances, split by season">Appearances by season</SectionTitle><StackedBySeason data={stack("apps")} seasons={seasonIds} /></div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle sub="Pairs with the most games together (min 5) and how the team did">Partnerships</SectionTitle></div>
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full">
              <thead><tr><th>Pair</th><th className="num">Together</th><th className="num">Win %</th><th className="num">GF/game</th></tr></thead>
              <tbody>{pairs.map((x) => <tr key={`${x.a}|${x.b}`}><td className="!whitespace-normal"><span className="flex flex-wrap items-center gap-x-1"><PlayerLink name={x.a} player={byName.get(x.a)} /><span className="text-ash">&amp;</span><PlayerLink name={x.b} player={byName.get(x.b)} /></span></td><td className="num">{x.shared}</td><td className={clsx("num font-semibold", x.winRate >= 30 ? "text-mint-soft" : "text-cream")}>{x.winRate}%</td><td className="num">{x.gpg}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle sub="Every opponent we've met, most-played first">Head to head</SectionTitle></div>
          <div className="scroll-x overflow-x-auto sm:max-h-[560px] sm:overflow-auto">
            <table className="stats w-full">
              <thead><tr><th>Opponent</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GD</th><th>Seasons</th></tr></thead>
              <tbody>{opponents.map((o) => { const gd = o.gf - o.ga; return <tr key={o.key}><td className="font-medium text-cream"><Link href={`/matches/${o.matches[o.matches.length - 1].id}`} className="link">{o.opponent}</Link></td><td className="num">{o.played}</td><td className="num text-mint-soft">{o.won}</td><td className="num text-[#ffe27a]">{o.drawn}</td><td className="num text-[#ff9a9d]">{o.lost}</td><td className={clsx("num", gd > 0 ? "text-mint-soft" : gd < 0 ? "text-[#ff9a9d]" : "")}>{signed(gd)}</td><td className="text-xs text-ash">{o.seasons.join(" ")}</td></tr>; })}</tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
