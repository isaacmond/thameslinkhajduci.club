import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, goalRace, leaderboard, pace, playedMatches, ppg, scoreline, seasonPlayers, signed } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { LeaderList, MatchRow, PageHeader, PlayerLink, RecordStrip, SectionTitle, Stat, Tag } from "@/components/ui";
import { GoalDiffTimeline } from "@/components/charts";
import { GoalRaceChart } from "@/components/charts-race";
import { SeasonTimeline } from "@/components/season-timeline";
import { PageTransition } from "@/components/page-transition";

export async function generateStaticParams() {
  const data = await getData();
  return [...data.seasons.map((s) => ({ id: s.id.toLowerCase() })), ...(data.friendlies ? [{ id: "friendlies" }] : [])];
}
type Data = Awaited<ReturnType<typeof getData>>;
const ordinal = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`; };
/** One line on how the current season's start stacks up against every previous one at the same point. */
function paceLine(p: ReturnType<typeof pace>): string | null {
  if (!p || p.games < 2 || p.of < 2) return null;
  const after = `${p.pts} point${p.pts === 1 ? "" : "s"} from ${p.games} games`;
  if (p.bestStart) return `${after}, the club's best start to a season.`;
  if (p.worstStart) return `${after}, the slowest start to a season so far.`;
  return `${after}, the ${p.tied ? "joint " : ""}${ordinal(p.rank)} best start of ${p.of} seasons.`;
}
const findSeason = (data: Data, id: string) => (/^(friendlies|fr)$/i.test(id) ? data.friendlies : data.seasons.find((x) => x.id === id.toUpperCase())) ?? null;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getData();
  const s = findSeason(data, id);
  if (!s) notFound();
  if (s.id === "FR") return { title: "Friendlies", description: "Thameslink Hajduci's games outside the league." };
  return { title: `Season ${s.number}`, description: `${s.title}: W${s.summary.won} D${s.summary.drawn} L${s.summary.lost}.` };
}

function FriendliesPage({ s }: { s: NonNullable<Data["friendlies"]> }) {
  const today = londonToday();
  const fixtures = chronological(s.matches);
  const played = fixtures.filter((m) => m.played);
  const w = played.filter((m) => m.result === "W").length, d = played.filter((m) => m.result === "D").length, l = played.filter((m) => m.result === "L").length;
  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow={<>{s.venue} · {s.period}</>} title="Friendlies" sub="Games outside the league." right={<nav className="flex gap-2" aria-label="Seasons"><Link href="/seasons" className="focus-ring chip text-muted hover:text-ink"><ChevronLeft size={14} aria-hidden />Seasons</Link></nav>} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Friendlies summary">
        <Stat label="Played" value={played.length} />
        <Stat label="Won" value={w} />
        <Stat label="Drawn" value={d} />
        <Stat label="Lost" value={l} />
      </section>
      <section className="card p-6" aria-label="Timeline">
        <SeasonTimeline season={s} today={today} />
      </section>
      <section>
        <SectionTitle>Matches</SectionTitle>
        {fixtures.length ? <div className="card grid grid-cols-1 gap-0.5 p-2 lg:grid-cols-2">{fixtures.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div> : <p className="card px-4 py-8 text-center text-sm text-muted">No friendlies yet.</p>}
      </section>
    </div>
    </PageTransition>
  );
}

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const s = findSeason(data, id);
  if (!s) notFound();
  if (s.id === "FR") return <FriendliesPage s={s} />;
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
  const played = s.matches.filter((m) => m.played).length;
  const diff = s.summary.goalsFor - s.summary.goalsAgainst;
  const small = counted.length < 3;
  const race = goalRace(data, s);
  const showRace = !small && race.players.length > 0 && race.rows.length >= 3;
  const paceNote = s.isCurrent ? paceLine(pace(data, s.id)) : null;

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow={<>{s.venue} · {s.period}</>} title={<>Season {s.number}</>} sub={<><span className="mb-2 block">{s.isCurrent ? <Tag tone="mint">In progress · {remaining} to play</Tag> : <Tag>Complete</Tag>}</span>{s.matches.length} fixtures, {played} played.{paceNote && <> {paceNote}</>}</>}
        right={<nav className="flex gap-2" aria-label="Other seasons">{prev && <Link href={`/seasons/${prev.id.toLowerCase()}`} className="focus-ring chip text-muted hover:text-ink"><ChevronLeft size={14} aria-hidden />Season {prev.number}</Link>}{next && <Link href={`/seasons/${next.id.toLowerCase()}`} className="focus-ring chip text-muted hover:text-ink">Season {next.number}<ChevronRight size={14} aria-hidden /></Link>}</nav>} />

      <section aria-label="Season summary">
        <RecordStrip s={s.summary} className="card lg:hidden" />
        <div className="hidden grid-cols-4 gap-3 lg:grid lg:grid-cols-8">
          <Stat label="Played" value={s.summary.played} />
          <Stat label="Won" value={s.summary.won} />
          <Stat label="Drawn" value={s.summary.drawn} />
          <Stat label="Lost" value={s.summary.lost} />
          <Stat label="Scored" value={s.summary.goalsFor} />
          <Stat label="Conceded" value={s.summary.goalsAgainst} />
          <Stat label="Difference" value={signed(diff)} />
          <Stat label="Points a game" value={ppg(s.summary).toFixed(2)} />
        </div>
      </section>

      <section className="card p-6" aria-label="Timeline">
        <SectionTitle sub="Every fixture, in order">The season</SectionTitle>
        <SeasonTimeline season={s} today={today} />
      </section>

      {gd.length > 0 && (small ? (
        null
      ) : (
        <section className="card p-6"><SectionTitle sub="Goal difference in each match">Match by match</SectionTitle><GoalDiffTimeline data={gd} /></section>
      ))}

      {showRace && (
        <section className="card p-6"><SectionTitle sub="Running goal totals for the leading scorers">Top scorer race</SectionTitle><GoalRaceChart rows={race.rows} players={race.players} /></section>
      )}

      {(() => {
        const cards = [
          <div key="boot" className="card p-6"><SectionTitle>Goals</SectionTitle><LeaderList items={leaderboard(players, "goals").slice(0, 5)} emptyText="No goals yet this season." /></div>,
          !small && <div key="apps" className="card p-6"><SectionTitle>Appearances</SectionTitle><LeaderList items={leaderboard(players, "apps").slice(0, 5)} color="bg-ink" emptyText="No appearances yet." /></div>,
          leaderboard(players, "motm").length > 0 && <div key="motm" className="card p-6"><SectionTitle>Man of the match</SectionTitle><LeaderList items={leaderboard(players, "motm").slice(0, 5)} color="bg-gold" /></div>,
        ].filter(Boolean);
        const fixturesBlock = (
          <div>
            <SectionTitle>Fixtures and results</SectionTitle>
            <div className={clsx("card grid grid-cols-1 gap-0.5 p-2", small ? "md:grid-cols-2" : "")}>{fixtures.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div>
          </div>
        );
        // Early in a season the sidebar would be one short card next to a long fixture list, so it goes on top instead.
        return small ? (
          <>
            <section className={clsx("grid grid-cols-1 gap-6", "md:grid-cols-2", cards.length >= 3 && "lg:grid-cols-3")}>{cards}</section>
            <section>{fixturesBlock}</section>
          </>
        ) : (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">{fixturesBlock}</div>
            <div className="space-y-6 lg:col-span-2 lg:sticky lg:top-24">{cards}</div>
          </section>
        );
      })()}

      <section className="card overflow-hidden">
        <div className="p-6 pb-3"><SectionTitle sub={`${players.length} players${hasMoney ? " · cost is each player's share of pitch hire" : ""}`}>Squad</SectionTitle></div>
        <div className="scroll-x overflow-x-auto">
          <table className="stats w-full md:min-w-[640px]">
            <thead><tr><th>Player</th><th className="num">P</th><th className="num">G</th><th className="num">A</th><th className="num hidden md:table-cell">Per game</th><th className="num hidden md:table-cell" title="Man of the match">MOTM</th><th className="num hidden sm:table-cell">W</th><th className="num hidden sm:table-cell">D</th><th className="num hidden sm:table-cell">L</th><th className="num hidden sm:table-cell">Win %</th>{hasMoney && <th className="num">Cost</th>}</tr></thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.slug}>
                  <td><PlayerLink name={p.name} player={byName.get(p.name)} /></td>
                  <td className="num">{p.apps}</td><td className={clsx("num", p.goals > 0 && "font-semibold")}>{p.goals}</td><td className="num">{p.assists}</td><td className="num hidden md:table-cell" >{p.goalsPerGame.toFixed(2)}</td>
                  <td className="num hidden md:table-cell">{p.motm || ""}</td>
                  <td className="num hidden sm:table-cell">{p.wins}</td><td className="num hidden sm:table-cell">{p.draws}</td><td className="num hidden sm:table-cell">{p.losses}</td><td className="num hidden sm:table-cell">{p.winRate.toFixed(0)}%</td>
                  {hasMoney && <td className="num">{fmtMoney(p.seasons[0]?.cost ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {!players.length && <p className="px-4 py-8 text-center text-sm text-muted">No appearances yet. The first match is on {fmtDate(fixtures[0]?.date ?? null)}.</p>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
