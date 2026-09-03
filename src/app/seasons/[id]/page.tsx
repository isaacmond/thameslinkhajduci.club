import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, leaderboard, playedMatches, ppg, scoreline, seasonPlayers, signed } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { LeaderList, MatchRow, PageHeader, PlayerLink, RecordStrip, SectionTitle, Stat, Tag } from "@/components/ui";
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
  const today = londonToday();
  const remaining = s.matches.filter((m) => !m.played && m.date && m.date >= today).length;
  const notCounted = s.matches.filter((m) => m.played && !m.countsForRecords).length;
  const played = s.matches.filter((m) => m.played).length;
  const diff = s.summary.goalsFor - s.summary.goalsAgainst;
  const small = counted.length < 3;

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow={<>{s.venue} · {s.period}</>} title={<>Season {s.number}</>} sub={<><span className="mb-2 block">{s.isCurrent ? <Tag tone="mint">In progress · {remaining} to play</Tag> : <Tag>Complete</Tag>}</span>{s.matches.length} fixtures, {played} played{notCounted > 0 && `, ${notCounted} not counted`}{s.summary.paidBy && <>. Pitch paid for by {s.summary.paidBy}, who would like that noted.</>}</>}
        right={<nav className="flex gap-2" aria-label="Other seasons">{prev && <Link href={`/seasons/${prev.id.toLowerCase()}`} className="focus-ring chip text-ash hover:text-cream"><ChevronLeft size={14} aria-hidden />{prev.id}</Link>}{next && <Link href={`/seasons/${next.id.toLowerCase()}`} className="focus-ring chip text-ash hover:text-cream">{next.id}<ChevronRight size={14} aria-hidden /></Link>}</nav>} />

      <section aria-label="Season summary">
        <RecordStrip s={s.summary} className="card lg:hidden" />
        <div className="hidden grid-cols-4 gap-3 lg:grid lg:grid-cols-8">
          <Stat label="Played" value={s.summary.played} />
          <Stat label="Won" value={s.summary.won} tone="win" />
          <Stat label="Drawn" value={s.summary.drawn} tone="draw" />
          <Stat label="Lost" value={s.summary.lost} tone="loss" />
          <Stat label="Goals for" value={s.summary.goalsFor} />
          <Stat label="Against" value={s.summary.goalsAgainst} />
          <Stat label="Goal diff" value={signed(diff)} tone={diff >= 0 ? "win" : "loss"} />
          <Stat label="Pts / game" value={ppg(s.summary).toFixed(2)} tone="gold" />
        </div>
      </section>

      {gd.length > 0 && (small ? (
        <section className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div><p className="eyebrow">The season so far</p><p className="display text-3xl text-cream">{counted.length} game{counted.length === 1 ? "" : "s"}. Small sample. Big feelings.</p></div>
          <p className="text-sm text-ash">The game-by-game chart appears after three games that count.</p>
        </section>
      ) : (
        <section className="card p-5"><SectionTitle sub="Goal difference per game. Green is good. There is not a lot of green.">The season, game by game</SectionTitle><GoalDiffTimeline data={gd} /></section>
      ))}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <SectionTitle sub="Everything on the fixture list, including the ones we'd rather forget">Fixtures &amp; results</SectionTitle>
          <div className="space-y-1.5">{fixtures.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div>
        </div>
        <div className="space-y-6 lg:col-span-2 lg:sticky lg:top-24">
          <div className="card p-5"><SectionTitle>Golden boot</SectionTitle><LeaderList items={leaderboard(players, "goals").slice(0, 5)} emptyText="No goals yet this season." /></div>
          {!small && <div className="card p-5"><SectionTitle>Season ticket holders</SectionTitle><LeaderList items={leaderboard(players, "apps").slice(0, 5)} color="bg-cream" emptyText="Nobody has turned up yet." /></div>}
          {leaderboard(players, "motm").length > 0 && <div className="card p-5"><SectionTitle>MOTM awards</SectionTitle><LeaderList items={leaderboard(players, "motm").slice(0, 5)} color="bg-gold" /></div>}
          {leaderboard(players, "champagne").length > 0 && <div className="card p-5"><SectionTitle sub="Awarded for moments of rare, um, quality">Champagne moments</SectionTitle><LeaderList items={leaderboard(players, "champagne").slice(0, 5)} color="bg-gold" /></div>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-5 pb-3"><SectionTitle sub={`${players.length} players used${hasMoney ? " · cost is each player's share of pitch hire" : ""}`}>Squad stats</SectionTitle></div>
        <div className="scroll-x overflow-x-auto">
          <table className="stats min-w-[640px]">
            <thead><tr><th>Player</th><th className="num">P</th><th className="num">G</th><th className="num">A</th><th className="num" title="Goals per game (games with scorers logged)">G/G</th><th className="num">MOTM</th><th className="num"><span aria-hidden>🍾</span><span className="sr-only">Champagne moments</span></th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">Win %</th>{hasMoney && <th className="num">Cost</th>}</tr></thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.slug}>
                  <td><PlayerLink name={p.name} player={byName.get(p.name)} /></td>
                  <td className="num">{p.apps}</td><td className={clsx("num", p.goals > 0 && "font-semibold text-mint-soft")}>{p.goals}</td><td className="num">{p.assists}</td><td className="num" title={`${p.goals} goals over ${p.gpgGames} games with scorers logged`}>{p.goalsPerGame.toFixed(2)}</td>
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
