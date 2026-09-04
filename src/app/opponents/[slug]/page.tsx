import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { CalendarClock, Skull, Trophy } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match, Player, PlayerMatchLine, SeasonSummary } from "@/lib/types";
import type { OpponentRecord } from "@/lib/stats";
import { chronological, fmtDate, gwLabel, headToHead, opponentKey, scoreline, seasonHref } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { slugify } from "@/lib/slug";
import { LeaderList, MatchRow, RecordStrip, ResultPill, SectionTitle, Stat, Tag } from "@/components/ui";
import { GoalDiffTimeline } from "@/components/charts";
import { Roundel, opponentVerdict, roundelColor } from "@/components/roundel";
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
  return { title: `vs ${o.opponent}`, description: `Thameslink Hajduci against ${o.opponent}: played ${o.played}, won ${o.won}, drawn ${o.drawn}, lost ${o.lost}, ${o.gf}–${o.ga} on aggregate.` };
}

const NUM = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const words = (n: number) => NUM[n] ?? String(n);
const plural = (n: number, w: string) => `${words(n).toLowerCase()} ${w}${n === 1 ? "" : "s"}`;
/** One dry line for the hero. */
function headline(o: OpponentRecord): string {
  const { played, won, drawn, lost } = o;
  if (played === 1) return won ? "Met once. Won. Retired from the fixture undefeated." : drawn ? "Met once. Shared the points, and the awkwardness." : "Met once. It did not go well.";
  if (won === 0 && drawn === 0) return `${words(played)} attempts. ${words(played)} lessons.`;
  if (won === 0) return `${words(played)} games, ${plural(drawn, "draw")}, no wins. Progress, technically.`;
  if (lost === 0 && drawn === 0) return `Played ${played}, won ${played}. Our favourite fixture, and we don't care who knows it.`;
  if (lost === 0) return `Unbeaten in ${played}. Somebody frame this.`;
  if (won > lost) return "More wins than defeats. Against this lot, anyway.";
  if (won === lost) return "Honours even. Nobody is satisfied.";
  if (won === 1) return `${words(played)} meetings, one win. It is spoken of often.`;
  return "They usually win. Usually.";
}

type Tone = "fame" | "shame";
function RecordCard({ icon, label, m, tone, empty }: { icon: React.ReactNode; label: string; m: Match | null; tone: Tone; empty: string }) {
  const body = (
    <>
      <span className={clsx("flex items-center justify-between", !m ? "text-ash" : tone === "fame" ? "text-mint-soft" : "text-[#ff9a9d]")}>{icon}<span className={clsx("text-[9px] font-bold uppercase tracking-[0.2em]", !m ? "text-ash/60" : tone === "fame" ? "text-mint-soft/70" : "text-[#ff9a9d]/70")}>{m ? tone : "pending"}</span></span>
      <span className="eyebrow mt-3 block">{label}</span>
      <span className="display mt-1 block text-4xl leading-none text-cream">{m ? scoreline(m) : "—"}</span>
    </>
  );
  return (
    <div className={clsx("card h-full p-5", m && tone === "fame" && "card-fame", m && tone === "shame" && "card-shame", m && "transition-transform hover:-translate-y-0.5")}>
      {m ? <Link href={`/matches/${m.id}`} className="focus-ring block rounded-lg">{body}</Link> : body}
      <p className="mt-1.5 text-sm italic text-cream/75">{m ? <>{m.seasonId} {gwLabel(m)} · <span className="nowrap">{fmtDate(m.date)}</span></> : empty}</p>
    </div>
  );
}

export default async function OpponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const all = headToHead(data.matches);
  const o = all.find((x) => x.slug === slug);
  if (!o) notFound();
  const rank = all.indexOf(o) + 1;
  const today = londonToday();
  const counted = chronological(o.matches);
  const first = counted[0], last = counted[counted.length - 1];
  const isThem = (m: Match) => opponentKey(m.opponent) === o.key;
  // Everything on the fixture list against them: counted games, forfeits and friendlies (flagged), plus anything still to come. Long-dead unplayed fixtures are left out.
  const meetings = chronological(data.matches).filter((m) => isThem(m) && (m.played || !m.date || m.date >= today)).reverse();
  const notCounted = meetings.filter((m) => m.played && !m.countsForRecords).length;
  const next = chronological(data.matches).find((m) => isThem(m) && !m.played && m.date !== null && m.date >= today) ?? null;

  const byName = new Map(data.players.map((p) => [p.name, p]));
  const ghost = (name: string): Player => ({ name, slug: slugify(name), apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0, goalsPerGame: 0, assistsPerGame: 0, gpgGames: 0, apgGames: 0, winRate: 0, debut: null, lastPlayed: null, seasons: [], extra: {} });
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
  const gd = counted.map((m) => ({ label: `${m.seasonId} GW${m.gw}`, gd: margin(m), opponent: m.opponent, score: scoreline(m) }));
  const v = opponentVerdict(o);
  const per = (n: number) => (o.played ? (n / o.played).toFixed(1) : "0.0");

  return (
    <PageTransition>
    <div className="space-y-8">
      <nav className="text-xs text-ash" aria-label="Breadcrumb"><Link href="/opponents" className="link">Opponents</Link> / {o.opponent}</nav>

      <header className="card-solid pitch relative overflow-hidden p-5 animate-rise sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl" style={{ background: roundelColor(o.opponent, 0.22) }} aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Roundel name={o.opponent} size={132} className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Opponent #{rank} by games played · {o.seasons.length} season{o.seasons.length === 1 ? "" : "s"}</p>
            <h1 className="display break-words text-5xl leading-none text-cream sm:text-7xl">{o.opponent}</h1>
            <p className="mt-3 max-w-2xl text-base italic text-cream/85 sm:text-lg">{headline(o)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {v && <Tag tone={v.tone}>{v.word}</Tag>}
              <Tag>First met {fmtDate(first.date)}</Tag>
              <Tag>Last met {fmtDate(last.date)}</Tag>
              {o.seasons.map((s) => <Link key={s} href={seasonHref(s)} className="focus-ring chip text-ash transition-colors hover:text-cream">{s}</Link>)}
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Head-to-head record">
        <RecordStrip s={summary} className="card" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label="Scored per game" value={per(o.gf)} tone="win" sub={`${o.gf} in ${o.played}`} />
          <Stat size="sm" label="Conceded per game" value={per(o.ga)} tone={o.ga > o.gf ? "loss" : "default"} sub={`${o.ga} in ${o.played}`} />
          <Stat size="sm" label="Clean sheets" value={cleanSheets} tone={cleanSheets ? "win" : "default"} sub={cleanSheets ? "against this lot" : "not against this lot"} />
          <Stat size="sm" label="Last meeting" value={<span className="inline-flex items-center gap-2"><ResultPill result={last.result} size="sm" />{scoreline(last)}</span>} sub={`${last.seasonId} · ${fmtDate(last.date, { day: "numeric", month: "short", year: "2-digit" })}`} />
        </div>
      </section>

      {counted.length >= 2 ? (
        <section className="card p-5"><SectionTitle sub="Goal difference in every game that counted. Green is us winning, which explains the amount of red.">Meeting by meeting</SectionTitle><GoalDiffTimeline data={gd} /></section>
      ) : (
        <section className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div><p className="eyebrow">The rivalry so far</p><p className="display text-3xl text-cream">One meeting. Hardly a rivalry.</p></div>
          <p className="text-sm text-ash">The meeting-by-meeting chart appears once there are two games to compare.</p>
        </section>
      )}

      <section className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RecordCard icon={<Trophy />} tone="fame" label="Biggest win against them" m={biggestWin} empty="Still pending. Like the 07:42." />
        <RecordCard icon={<Skull />} tone="shame" label="Heaviest defeat against them" m={heaviest} empty="They have never beaten us. Put that on a mug." />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className="space-y-6 lg:col-span-3">
          {next && (
            <div className="card card-fame p-4">
              <p className="eyebrow mb-2 flex items-center gap-2 !text-mint-soft"><CalendarClock size={14} aria-hidden />Next meeting</p>
              <MatchRow m={next} today={today} showSeason />
              <p className="mt-2 text-xs text-ash">{gwLabel(next)} of {next.seasonId}, {fmtDate(next.date, { weekday: "long", day: "numeric", month: "long" })}{next.kickOff && ` at ${next.kickOff}`}. Pencilled in; Thameslink permitting. <Link href={`/matches/${next.id}`} className="link">Match page →</Link></p>
            </div>
          )}
          <div>
            <SectionTitle sub={<>{meetings.length} on the fixture list, newest first{notCounted > 0 && <>. {notCounted} faded: forfeits and friendlies are on the list but not in the record</>}.</>}>Every meeting</SectionTitle>
            <div className="grid grid-cols-1 gap-1.5">
              {meetings.map((m) => <div key={m.id} className={clsx(m.played && !m.countsForRecords && "opacity-60")}><MatchRow m={m} today={today} showSeason /></div>)}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2 lg:sticky lg:top-24">
          <div className="card p-5"><SectionTitle sub="Goals in games that counted">Top scorers against them</SectionTitle><LeaderList items={scorers.slice(0, 5)} emptyText="Nobody has scored against them. Not once. Not even by accident." /></div>
          <div className="card p-5"><SectionTitle sub="Appearances in this fixture">Turned up most</SectionTitle><LeaderList items={regulars.slice(0, 5)} color="bg-cream" emptyText="No line-ups logged for these games." /></div>
          {motm.length > 0 && <div className="card p-5"><SectionTitle sub="Man of the match awards in this fixture">Stood out</SectionTitle><LeaderList items={motm.slice(0, 5)} color="bg-gold" /></div>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
