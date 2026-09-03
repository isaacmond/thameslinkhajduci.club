import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, leaderboard, playedMatches, ppg, scoreline, seasonPlayers, signed } from "@/lib/stats";
import { LeaderList, MatchRow, PageHeader, PlayerLink, SectionTitle, Stat, Tag } from "@/components/ui";
import { GoalDiffTimeline } from "@/components/charts";
import { PageTransition } from "@/components/page-transition";

export async function generateStaticParams() {
  const data = await getData();
  return data.seasons.map((s) => ({ id: s.id.toLowerCase() }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getData();
  const s = data.seasons.find((x) => x.id === id.toUpperCase());
  if (!s) notFound();
  return { title: `Season ${s.number}`, description: `${s.title}: W${s.summary.won} D${s.summary.drawn} L${s.summary.lost}.` };
}

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const s = data.seasons.find((x) => x.id === id.toUpperCase());
  if (!s) notFound();
  const i = data.seasons.indexOf(s);
  const prev = data.seasons[i - 1], next = data.seasons[i + 1];
  const players = seasonPlayers(data, s.id);
  const counted = chronological(playedMatches(s.matches));
  const gd = counted.map((m) => ({ label: `GW${m.gw}`, gd: m.ourGoals! - m.theirGoals!, opponent: m.opponent, score: scoreline(m) }));
  const fixtures = chronological(s.matches);
  const hasMoney = s.matches.some((m) => m.matchCost > 0);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const today = new Date().toISOString().slice(0, 10);
  const remaining = s.matches.filter((m) => !m.played && m.date && m.date >= today).length;
  const diff = s.summary.goalsFor - s.summary.goalsAgainst;

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow={<>{s.venue} · {s.period}</>} title={<>Season {s.number}</>} sub={<><span className="mb-2 block">{s.isCurrent ? <Tag tone="mint">In progress · {remaining} to play</Tag> : <Tag>Complete</Tag>}</span>{s.matches.length} fixtures{s.matches.length !== s.summary.played && `, ${s.summary.played} counted`}{s.summary.paidBy && <>. Pitch paid for by {s.summary.paidBy}, who would like that noted.</>}</>}
        right={<nav className="flex gap-2" aria-label="Other seasons">{prev && <Link href={`/seasons/${prev.id.toLowerCase()}`} className="focus-ring chip text-ash hover:text-cream"><ChevronLeft size={14} aria-hidden />{prev.id}</Link>}{next && <Link href={`/seasons/${next.id.toLowerCase()}`} className="focus-ring chip text-ash hover:text-cream">{next.id}<ChevronRight size={14} aria-hidden /></Link>}</nav>} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Season summary">
        <Stat label="Played" value={s.summary.played} />
        <Stat label="Won" value={s.summary.won} tone="win" />
        <Stat label="Drawn" value={s.summary.drawn} tone="draw" />
        <Stat label="Lost" value={s.summary.lost} tone="loss" />
        <Stat label="Goals for" value={s.summary.goalsFor} />
        <Stat label="Against" value={s.summary.goalsAgainst} />
        <Stat label="Goal diff" value={signed(diff)} tone={diff >= 0 ? "win" : "loss"} />
        <Stat label="Pts / game" value={ppg(s.summary).toFixed(2)} tone="gold" />
      </section>

      {gd.length > 0 && <section className="card p-5"><SectionTitle sub="Goal difference per game. Green is good. There is not a lot of green.">The season, game by game</SectionTitle><GoalDiffTimeline data={gd} /></section>}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionTitle sub="Everything on the fixture list, including the ones we'd rather forget">Fixtures &amp; results</SectionTitle>
          <div className="space-y-1.5">{fixtures.map((m) => <MatchRow key={m.id} m={m} />)}</div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5"><SectionTitle>Golden boot</SectionTitle><LeaderList items={leaderboard(players, "goals").slice(0, 5)} emptyText="No goals yet this season." /></div>
          <div className="card p-5"><SectionTitle>Ever-present</SectionTitle><LeaderList items={leaderboard(players, "apps").slice(0, 5)} color="bg-blue-400" emptyText="Nobody has turned up yet." /></div>
          {leaderboard(players, "motm").length > 0 && <div className="card p-5"><SectionTitle>MOTM awards</SectionTitle><LeaderList items={leaderboard(players, "motm").slice(0, 5)} color="bg-gold" /></div>}
          {leaderboard(players, "champagne").length > 0 && <div className="card p-5"><SectionTitle sub="Awarded for moments of rare, um, quality">Champagne moments</SectionTitle><LeaderList items={leaderboard(players, "champagne").slice(0, 5)} color="bg-peach" /></div>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-5 pb-3"><SectionTitle sub={`${players.length} players used${hasMoney ? " · costs are the player's share of pitch hire" : ""}`}>Squad stats</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="stats min-w-[560px]">
            <thead><tr><th>#</th><th>Player</th><th className="num">P</th><th className="num">G</th><th className="num">A</th><th className="num">G/G</th><th className="num">MOTM</th><th className="num">🍾</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">Win %</th>{hasMoney && <th className="num">Cost</th>}</tr></thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.slug}>
                  <td className="text-ash">{idx + 1}</td>
                  <td><PlayerLink name={p.name} player={byName.get(p.name)} /></td>
                  <td className="num">{p.apps}</td><td className={clsx("num", p.goals > 0 && "font-semibold text-mint-soft")}>{p.goals}</td><td className="num">{p.assists}</td><td className="num">{p.goalsPerGame.toFixed(2)}</td>
                  <td className="num">{p.motm || ""}</td><td className="num">{p.champagne || ""}</td>
                  <td className="num text-mint-soft">{p.wins}</td><td className="num text-[#ffe27a]">{p.draws}</td><td className="num text-[#ff9a9d]">{p.losses}</td><td className="num">{p.winRate.toFixed(0)}%</td>
                  {hasMoney && <td className="num">{fmtMoney(p.seasons[0]?.cost ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {!players.length && <p className="px-4 py-8 text-center text-sm text-ash">No appearances logged yet. First game {fmtDate(fixtures[0]?.date ?? null)}.</p>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
