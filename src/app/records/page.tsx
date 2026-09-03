import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Crown, Flame, Medal, PartyPopper, ShieldCheck, Siren, Skull, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import type { Streak } from "@/lib/stats";
import { currentStreak, fmtDate, playedMatches, ppg, records, scoreline } from "@/lib/stats";
import { PageHeader, PlayerLink, ResultPill, SectionTitle } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Records", description: "Biggest wins, heaviest defeats, streaks, hat-tricks and other Thameslink Hajduci records." };

type Tone = "fame" | "shame" | "neutral";
function Card({ icon, label, value, sub, href, tone = "neutral" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: Tone }) {
  const head = (
    <>
      <span className={clsx("flex items-center justify-between", tone === "fame" && "text-mint-soft", tone === "shame" && "text-[#ff9a9d]", tone === "neutral" && "text-gold")}>{icon}<span className={clsx("text-[9px] font-bold uppercase tracking-[0.2em]", tone === "fame" ? "text-mint-soft/70" : tone === "shame" ? "text-[#ff9a9d]/70" : "text-ash/60")}>{tone === "neutral" ? "" : tone}</span></span>
      <span className="eyebrow mt-3 block min-h-[2lh] leading-tight">{label}</span>
      <span className="display mt-1 block text-4xl leading-none text-cream">{value}</span>
    </>
  );
  return (
    <div className={clsx("card h-full p-5", tone === "fame" && "card-fame", tone === "shame" && "card-shame", href && "transition-transform hover:-translate-y-0.5")}>
      {href ? <Link href={href} className="focus-ring block rounded-lg">{head}</Link> : head}
      {sub && <p className="mt-1.5 text-sm italic text-cream/75">{sub}</p>}
    </div>
  );
}
const matchSub = (m: Match) => <>vs {m.opponent} · {m.seasonId} · {fmtDate(m.date)}</>;
const streakSub = (s: Streak) => <>{fmtDate(s.start.date, { day: "numeric", month: "short", year: "2-digit" })} → {fmtDate(s.end.date, { day: "numeric", month: "short", year: "2-digit" })}</>;

export default async function RecordsPage() {
  const data = await getData();
  const r = records(data);
  const cur = currentStreak(data.matches);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const seasonBests = data.players.flatMap((p) => p.seasons.map((s) => ({ player: p, ...s })));
  const mostGoalsSeason = [...seasonBests].sort((a, b) => b.goals - a.goals)[0];
  const mostAppsSeason = [...seasonBests].sort((a, b) => b.apps - a.apps)[0];
  const mostAssistsSeason = [...seasonBests].sort((a, b) => b.assists - a.assists)[0];
  const motmKing = [...data.players].sort((a, b) => b.motm - a.motm)[0];
  const champKing = [...data.players].sort((a, b) => b.champagne - a.champagne)[0];
  const mostLosses = [...data.players].sort((a, b) => b.losses - a.losses)[0];
  const best = data.seasons.find((s) => s.id === r.bestSeason), worst = data.seasons.find((s) => s.id === r.worstSeason);
  // Ever-present: played every counted, scored game of a season (seasons of 5+ such games). Compared against the actual line-ups, not the apps column.
  const everPresent = data.seasons.flatMap((s) => { const counted = playedMatches(s.matches); return counted.length >= 5 ? data.players.filter((p) => counted.every((m) => m.lineup.some((l) => l.player === p.name && l.played))).map((p) => ({ player: p, season: s, n: counted.length })) : []; });
  const hatTrickPlayers = new Set(r.hatTricks.map((h) => h.player)).size;

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Hall of fame / hall of shame" title="Records" sub="Everything worth bragging about and a great deal that isn't. Green cards are fame, red cards are shame. Friendlies and forfeits excluded, mercifully." />

      <section><SectionTitle sub="The club, collectively">Team records</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {r.biggestWin && <Card icon={<Trophy />} tone="fame" label="Biggest win" value={scoreline(r.biggestWin)} sub={matchSub(r.biggestWin)} href={`/matches/${r.biggestWin.id}`} />}
          {r.heaviestDefeat && <Card icon={<Skull />} tone="shame" label="Heaviest defeat" value={scoreline(r.heaviestDefeat)} sub={matchSub(r.heaviestDefeat)} href={`/matches/${r.heaviestDefeat.id}`} />}
          {r.highestScoring && <Card icon={<Zap />} label="Highest-scoring game" value={`${r.highestScoring.ourGoals! + r.highestScoring.theirGoals!} goals`} sub={<>{scoreline(r.highestScoring)} {matchSub(r.highestScoring)}</>} href={`/matches/${r.highestScoring.id}`} />}
          {r.mostGoalsScored && <Card icon={<Target />} tone="fame" label="Most goals scored" value={r.mostGoalsScored.ourGoals} sub={<>{scoreline(r.mostGoalsScored)} {matchSub(r.mostGoalsScored)}</>} href={`/matches/${r.mostGoalsScored.id}`} />}
          {r.mostConceded && <Card icon={<Siren />} tone="shame" label="Most conceded" value={r.mostConceded.theirGoals} sub={<>{scoreline(r.mostConceded)} {matchSub(r.mostConceded)}</>} href={`/matches/${r.mostConceded.id}`} />}
          <Card icon={<ShieldCheck />} tone={r.cleanSheets.length ? "fame" : "shame"} label="Clean sheets" value={r.cleanSheets.length} sub={r.cleanSheets.length ? <>{r.cleanSheets.slice(0, 3).map((m) => <Link key={m.id} href={`/matches/${m.id}`} className="link mr-2">{scoreline(m)} {m.opponent}</Link>)}</> : "Not one. Not a single one."} />
          {best && <Card icon={<Crown />} tone="fame" label="Best season" value={best.id} sub={<>{ppg(best.summary).toFixed(2)} pts/game · W{best.summary.won} D{best.summary.drawn} L{best.summary.lost}</>} href={`/seasons/${best.id.toLowerCase()}`} />}
          {worst && <Card icon={<Skull />} tone="shame" label="Worst season" value={worst.id} sub={<>{ppg(worst.summary).toFixed(2)} pts/game · W{worst.summary.won} D{worst.summary.drawn} L{worst.summary.lost}</>} href={`/seasons/${worst.id.toLowerCase()}`} />}
        </div>
      </section>

      <section><SectionTitle sub="Runs of results, for better and for very much worse">Streaks</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {r.longestWin && <Card icon={<Flame />} tone="fame" label="Longest winning run" value={`${r.longestWin.length} games`} sub={streakSub(r.longestWin)} />}
          {r.longestUnbeaten && <Card icon={<ShieldCheck />} tone="fame" label="Longest unbeaten run" value={`${r.longestUnbeaten.length} games`} sub={streakSub(r.longestUnbeaten)} />}
          {r.longestLosing && <Card icon={<Skull />} tone="shame" label="Longest losing run" value={`${r.longestLosing.length} games`} sub={streakSub(r.longestLosing)} />}
          {r.longestWinless && <Card icon={<Siren />} tone="shame" label="Longest winless run" value={`${r.longestWinless.length} games`} sub={streakSub(r.longestWinless)} />}
          {cur && <Card icon={<ResultPill result={cur.type} size="sm" />} tone={cur.type === "W" ? "fame" : cur.type === "L" ? "shame" : "neutral"} label="Current run" value={<span className="inline-flex flex-wrap items-center gap-2">{cur.length} {cur.type === "W" ? "win" : cur.type === "L" ? "loss" : "draw"}{cur.length === 1 ? "" : cur.type === "L" ? "es" : "s"}<span className="chip animate-pulse-soft text-[9px] text-ash">Live</span></span>} sub={cur.type === "L" ? "Ongoing. Thoughts and prayers." : cur.type === "W" ? "Long may it continue." : "Baffling."} />}
        </div>
      </section>

      <section><SectionTitle sub="Individual brilliance, and the other thing">Player records</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {mostGoalsSeason && <Card icon={<Target />} tone="fame" label="Most goals in a season" value={mostGoalsSeason.goals} sub={<><PlayerLink name={mostGoalsSeason.player.name} player={mostGoalsSeason.player} /> · {mostGoalsSeason.seasonId}</>} />}
          {mostAppsSeason && <Card icon={<Medal />} tone="fame" label="Most apps in a season" value={mostAppsSeason.apps} sub={<><PlayerLink name={mostAppsSeason.player.name} player={mostAppsSeason.player} /> · {mostAppsSeason.seasonId}</>} />}
          {mostAssistsSeason && mostAssistsSeason.assists > 0 && <Card icon={<Sparkles />} label="Most assists in a season" value={mostAssistsSeason.assists} sub={<><PlayerLink name={mostAssistsSeason.player.name} player={mostAssistsSeason.player} /> · {mostAssistsSeason.seasonId}</>} />}
          {motmKing && motmKing.motm > 0 && <Card icon={<Crown />} tone="fame" label="Most MOTM awards" value={motmKing.motm} sub={<PlayerLink name={motmKing.name} player={motmKing} />} />}
          {champKing && champKing.champagne > 0 && <Card icon={<PartyPopper />} tone="shame" label="Most champagne moments" value={champKing.champagne} sub={<><PlayerLink name={champKing.name} player={champKing} /> · a true entertainer</>} />}
          {mostLosses && <Card icon={<Skull />} tone="shame" label="Most defeats witnessed" value={mostLosses.losses} sub={<><PlayerLink name={mostLosses.name} player={mostLosses} /> · loyalty, or masochism</>} />}
          {r.hatTricks[0] && <Card icon={<Zap />} tone="fame" label="Most goals in a game" value={r.hatTricks[0].goals} sub={<><PlayerLink name={r.hatTricks[0].player} player={byName.get(r.hatTricks[0].player)} /> vs {r.hatTricks[0].match.opponent}</>} href={`/matches/${r.hatTricks[0].match.id}`} />}
          <Card icon={<Trophy />} tone="fame" label="Hat-tricks" value={r.hatTricks.length} sub={r.hatTricks.length ? `by ${hatTrickPlayers} different player${hatTrickPlayers === 1 ? "" : "s"}` : "None yet"} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card overflow-hidden"><div className="p-5 pb-2"><SectionTitle sub="Three or more in a single game">Hat-tricks</SectionTitle></div>
          {r.hatTricks.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full">
                <thead><tr><th>Player</th><th className="num">Goals</th><th>Match</th></tr></thead>
                <tbody>{r.hatTricks.map((h) => <tr key={`${h.match.id}-${h.player}`}><td className="h-12"><PlayerLink name={h.player} player={byName.get(h.player)} avatar /></td><td className="num display text-xl text-mint-soft">{h.goals}</td><td className="!whitespace-normal"><Link href={`/matches/${h.match.id}`} className="link">{scoreline(h.match)} vs {h.match.opponent}</Link><span className="block text-xs text-ash">{h.match.seasonId} · {fmtDate(h.match.date)}</span></td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="px-5 pb-5 text-sm text-ash">Nobody has managed three in a game. Yet.</p>}
        </div>
        <div className="card overflow-hidden"><div className="p-5 pb-2"><SectionTitle sub="Played every counted game of a season (seasons of 5+ games)">Ever-presents</SectionTitle></div>
          {everPresent.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full"><thead><tr><th>Player</th><th>Season</th><th className="num">Games</th></tr></thead><tbody>{everPresent.map((e) => <tr key={`${e.player.slug}-${e.season.id}`}><td className="h-12"><PlayerLink name={e.player.name} player={e.player} avatar /></td><td><Link href={`/seasons/${e.season.id.toLowerCase()}`} className="link">{e.season.id}</Link> <span className="text-ash">{e.season.period}</span></td><td className="num">{e.n}</td></tr>)}</tbody></table>
            </div>
          ) : <p className="px-5 pb-5 text-sm text-ash">Nobody has played every game of a season. Life gets in the way. So does Thameslink.</p>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
