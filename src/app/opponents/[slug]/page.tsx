import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match, Player, PlayerMatchLine, SeasonSummary } from "@/lib/types";
import type { OpponentRecord } from "@/lib/stats";
import { chronological, fmtDate, gwLabel, headToHead, opponentKey, scoreline, seasonHref } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { slugify } from "@/lib/slug";
import { Breadcrumb, LeaderList, MatchRow, RecordCard, RecordStrip, ResultPill, SectionTitle, Stat, Tag } from "@/components/ui";
import { GoalDiffBars } from "@/components/goal-diff-bars";
import { TeamBadge, opponentVerdict } from "@/components/team-badge";
import { PageTransition } from "@/components/page-transition";

export async function generateStaticParams() {
  const data = await getData();
  return headToHead(data.matches).map((o) => ({ slug: o.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData();
  const o = headToHead(data.matches).find((x) => x.slug === slug);
  if (!o) notFound();
  return { title: `v ${o.opponent}`, description: `Thameslink Hajduci against ${o.opponent}: played ${o.played}, won ${o.won}, drawn ${o.drawn}, lost ${o.lost}, ${o.gf}–${o.ga} on aggregate.` };
}

/** One plain sentence summing up the fixture. */
function headline(o: OpponentRecord): string {
  const { played, won, drawn, lost } = o;
  const games = `${played} meeting${played === 1 ? "" : "s"}`;
  if (played === 1) return won ? "Played once, and won." : drawn ? "Played once, a draw." : "Played once, a defeat.";
  if (lost === 0) return `Unbeaten in ${games}.`;
  if (won === 0) return `${games[0].toUpperCase()}${games.slice(1)} without a win so far.`;
  if (won > lost) return `${won} wins to ${lost} defeats across ${games}.`;
  if (won === lost) return `Level: ${won} wins each across ${games}.`;
  return `${lost} defeats to ${won} wins across ${games}.`;
}

const meetingSub = (m: Match | null, empty: string) => (m ? <>Season {m.seasonId.replace(/^S/, "")}, {gwLabel(m)} · <span className="nowrap">{fmtDate(m.date)}</span></> : empty);

export default async function OpponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const all = headToHead(data.matches);
  const o = all.find((x) => x.slug === slug);
  if (!o) notFound();
  const today = londonToday();
  const counted = chronological(o.matches);
  const first = counted[0], last = counted[counted.length - 1];
  const isThem = (m: Match) => opponentKey(m.opponent) === o.key;
  // Everything on the fixture list against them: counted games, forfeits and friendlies (flagged), plus anything still to come. Long-dead unplayed fixtures are left out.
  const meetings = chronological(data.matches).filter((m) => isThem(m) && (m.played || !m.date || m.date >= today)).reverse();
  const next = chronological(data.matches).find((m) => isThem(m) && !m.played && m.date !== null && m.date >= today) ?? null;

  const byName = new Map(data.players.map((p) => [p.name, p]));
  const ghost = (name: string): Player => ({ name, slug: slugify(name), apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0, goalsPerGame: 0, assistsPerGame: 0, gpgGames: 0, apgGames: 0, winRate: 0, debut: null, lastPlayed: null, seasons: [], extra: {}, ringer: false });
  const tally = (pick: (l: PlayerMatchLine) => number) => {
    const t = new Map<string, number>();
    for (const m of counted) for (const l of m.lineup) { const v = pick(l); if (v > 0) t.set(l.player, (t.get(l.player) ?? 0) + v); }
    return [...t].map(([name, value]) => ({ player: byName.get(name) ?? ghost(name), value })).sort((a, b) => b.value - a.value || b.player.apps - a.player.apps || a.player.name.localeCompare(b.player.name));
  };
  const scorers = tally((l) => l.goals);
  const regulars = tally((l) => (l.played ? 1 : 0));
  const motmCount = new Map<string, number>();
  for (const m of counted) if (m.motm) motmCount.set(m.motm, (motmCount.get(m.motm) ?? 0) + 1);
  const motm = [...motmCount].map(([name, value]) => ({ player: byName.get(name) ?? ghost(name), value })).sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name));

  const margin = (m: Match) => m.ourGoals! - m.theirGoals!;
  const wins = counted.filter((m) => margin(m) > 0), defeats = counted.filter((m) => margin(m) < 0);
  const biggestWin = wins.length ? [...wins].sort((a, b) => margin(b) - margin(a) || b.ourGoals! - a.ourGoals!)[0] : null;
  const heaviest = defeats.length ? [...defeats].sort((a, b) => margin(a) - margin(b) || b.theirGoals! - a.theirGoals!)[0] : null;
  const cleanSheets = counted.filter((m) => m.theirGoals === 0).length;
  const summary: SeasonSummary = { played: o.played, won: o.won, drawn: o.drawn, lost: o.lost, goalsFor: o.gf, goalsAgainst: o.ga, topScorer: scorers[0]?.player.name ?? null, mostApps: regulars[0]?.player.name ?? null, seasonCost: 0, paidBy: null };
  const v = opponentVerdict(o);
  const per = (n: number) => (o.played ? (n / o.played).toFixed(1) : "0.0");

  return (
    <PageTransition>
    <div className="space-y-10">
      <Breadcrumb items={[{ href: "/opponents", label: "Opponents" }, { label: o.opponent }]} />

      <header className="flex flex-col gap-6 border-b border-ink/10 pb-6 animate-rise sm:flex-row sm:items-center sm:gap-8">
        <TeamBadge name={o.opponent} size={112} className="h-20 w-20 sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Opponent #{all.indexOf(o) + 1} by matches played · {o.seasons.length} season{o.seasons.length === 1 ? "" : "s"}</p>
          <h1 className="display mt-1 break-words text-5xl leading-[0.95] text-ink sm:text-7xl">{o.opponent}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">{headline(o)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {v && <Tag tone={v.tone}>{v.word}</Tag>}
            <Tag>First played {fmtDate(first.date)}</Tag>
            <Tag>Last played {fmtDate(last.date)}</Tag>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">{o.seasons.map((s) => <Link key={s} href={seasonHref(s)} className="link focus-ring rounded">Season {s.replace(/^S/, "")}</Link>)}</p>
        </div>
      </header>

      <section aria-label="Head-to-head record">
        <RecordStrip s={summary} className="card" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label="Scored per game" value={per(o.gf)} sub={`${o.gf} in ${o.played}`} />
          <Stat size="sm" label="Conceded per game" value={per(o.ga)} sub={`${o.ga} in ${o.played}`} />
          <Stat size="sm" label="Clean sheets" value={cleanSheets} />
          <Stat size="sm" label="Last meeting" value={scoreline(last)} sub={<span className="inline-flex items-center gap-1.5"><ResultPill result={last.result} size="sm" className="-my-1" />{fmtDate(last.date, { day: "numeric", month: "short", year: "numeric" })}</span>} />
        </div>
      </section>

      {counted.length >= 2 ? (
        <section className="card p-6"><SectionTitle sub="Goal difference in each meeting">Meeting by meeting</SectionTitle><GoalDiffBars matches={counted} opponent={o.opponent} /></section>
      ) : (
        <section className="card p-6 text-sm text-muted">One meeting so far. A chart of every meeting appears from the second.</section>
      )}

      <section className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RecordCard compact label="Biggest win" value={biggestWin ? scoreline(biggestWin) : "–"} sub={meetingSub(biggestWin, "No wins yet.")} href={biggestWin ? `/matches/${biggestWin.id}` : undefined} />
        <RecordCard compact label="Heaviest defeat" value={heaviest ? scoreline(heaviest) : "–"} sub={meetingSub(heaviest, "Never beaten us.")} href={heaviest ? `/matches/${heaviest.id}` : undefined} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className="space-y-6 lg:col-span-3">
          {next && (
            <div className="card p-6">
              <p className="eyebrow mb-2 flex items-center gap-2"><CalendarClock size={14} aria-hidden />Next meeting</p>
              <div className="-mx-3"><MatchRow m={next} today={today} showSeason /></div>
            </div>
          )}
          <div>
            <SectionTitle sub={`${meetings.length} on the fixture list, most recent first`}>Every meeting</SectionTitle>
            <div className="card grid grid-cols-1 gap-0.5 p-2">
              {meetings.map((m) => <MatchRow key={m.id} m={m} today={today} showSeason />)}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2 lg:sticky lg:top-24">
          <div className="card p-6"><SectionTitle>Top scorers</SectionTitle><LeaderList items={scorers.slice(0, 5)} emptyText="No goals against them yet." /></div>
          <div className="card p-6"><SectionTitle>Most appearances</SectionTitle><LeaderList items={regulars.slice(0, 5)} color="bg-ink" emptyText="No line-ups recorded." /></div>
          {motm.length > 0 && <div className="card p-6"><SectionTitle>Man of the match</SectionTitle><LeaderList items={motm.slice(0, 5)} color="bg-gold" /></div>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
