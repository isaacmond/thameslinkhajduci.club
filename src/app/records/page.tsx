import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Crown, Flame, Medal, PartyPopper, ShieldCheck, Siren, Skull, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import type { Streak } from "@/lib/stats";
import { currentStreak, fmtDate, ppg, records, scoreline } from "@/lib/stats";
import { PageHeader, PlayerLink, ResultPill, SectionTitle } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Records", description: "Biggest wins, heaviest defeats, streaks, hat-tricks and other Thameslink Hajduci records." };

function Card({ icon, label, value, sub, href, tone = "default" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: "default" | "good" | "bad" | "gold" }) {
  const head = (
    <>
      <span className={clsx("block", tone === "good" && "text-mint-soft", tone === "bad" && "text-[#ff9a9d]", tone === "gold" && "text-gold", tone === "default" && "text-ash")}>{icon}</span>
      <span className="eyebrow mt-3 block">{label}</span>
      <span className="display mt-1 block text-4xl leading-none text-cream">{value}</span>
    </>
  );
  return (
    <div className={clsx("card h-full p-5", href && "transition-colors hover:border-white/20")}>
      {href ? <Link href={href} className="focus-ring block rounded-lg">{head}</Link> : head}
      {sub && <p className="mt-1 text-sm text-ash">{sub}</p>}
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
  const everPresent = data.seasons.flatMap((s) => { const n = s.matches.filter((m) => m.countsForRecords && m.played).length; return n >= 5 ? data.players.filter((p) => (p.seasons.find((x) => x.seasonId === s.id)?.apps ?? 0) >= n).map((p) => ({ player: p, season: s, n })) : []; });

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Hall of fame / shame" title="Records" sub="Everything worth bragging about and a great deal that isn't. Friendlies and forfeits excluded, mercifully." />

      <section><SectionTitle sub="The club, collectively">Team records</SectionTitle>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {r.biggestWin && <Card icon={<Trophy />} tone="good" label="Biggest win" value={scoreline(r.biggestWin)} sub={matchSub(r.biggestWin)} href={`/matches/${r.biggestWin.id}`} />}
          {r.heaviestDefeat && <Card icon={<Skull />} tone="bad" label="Heaviest defeat" value={scoreline(r.heaviestDefeat)} sub={matchSub(r.heaviestDefeat)} href={`/matches/${r.heaviestDefeat.id}`} />}
          {r.highestScoring && <Card icon={<Zap />} tone="gold" label="Highest-scoring game" value={`${r.highestScoring.ourGoals! + r.highestScoring.theirGoals!} goals`} sub={<>{scoreline(r.highestScoring)} {matchSub(r.highestScoring)}</>} href={`/matches/${r.highestScoring.id}`} />}
          {r.mostGoalsScored && <Card icon={<Target />} tone="good" label="Most goals scored" value={r.mostGoalsScored.ourGoals} sub={<>{scoreline(r.mostGoalsScored)} {matchSub(r.mostGoalsScored)}</>} href={`/matches/${r.mostGoalsScored.id}`} />}
          {r.mostConceded && <Card icon={<Siren />} tone="bad" label="Most conceded" value={r.mostConceded.theirGoals} sub={<>{scoreline(r.mostConceded)} {matchSub(r.mostConceded)}</>} href={`/matches/${r.mostConceded.id}`} />}
          <Card icon={<ShieldCheck />} tone={r.cleanSheets.length ? "good" : "bad"} label="Clean sheets" value={r.cleanSheets.length} sub={r.cleanSheets.length ? <>{r.cleanSheets.slice(0, 3).map((m) => <Link key={m.id} href={`/matches/${m.id}`} className="link mr-2">{scoreline(m)} {m.opponent}</Link>)}</> : "Not one. Not a single one."} />
          {best && <Card icon={<Crown />} tone="gold" label="Best season" value={best.id} sub={<>{ppg(best.summary).toFixed(2)} pts/game · W{best.summary.won} D{best.summary.drawn} L{best.summary.lost}</>} href={`/seasons/${best.id.toLowerCase()}`} />}
          {worst && <Card icon={<Skull />} tone="bad" label="Worst season" value={worst.id} sub={<>{ppg(worst.summary).toFixed(2)} pts/game · W{worst.summary.won} D{worst.summary.drawn} L{worst.summary.lost}</>} href={`/seasons/${worst.id.toLowerCase()}`} />}
        </div>
      </section>

      <section><SectionTitle sub="Runs of results, for better and for very much worse">Streaks</SectionTitle>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {r.longestWin && <Card icon={<Flame />} tone="good" label="Longest winning run" value={`${r.longestWin.length} games`} sub={streakSub(r.longestWin)} />}
          {r.longestUnbeaten && <Card icon={<ShieldCheck />} tone="good" label="Longest unbeaten run" value={`${r.longestUnbeaten.length} games`} sub={streakSub(r.longestUnbeaten)} />}
          {r.longestLosing && <Card icon={<Skull />} tone="bad" label="Longest losing run" value={`${r.longestLosing.length} games`} sub={streakSub(r.longestLosing)} />}
          {r.longestWinless && <Card icon={<Siren />} tone="bad" label="Longest winless run" value={`${r.longestWinless.length} games`} sub={streakSub(r.longestWinless)} />}
          {cur && <Card icon={<ResultPill result={cur.type} size="sm" />} tone={cur.type === "W" ? "good" : cur.type === "L" ? "bad" : "default"} label="Current run" value={`${cur.length} ${cur.type === "W" ? "win" : cur.type === "L" ? "loss" : "draw"}${cur.length === 1 ? "" : cur.type === "L" ? "es" : "s"}`} sub={cur.type === "L" ? "Ongoing. Thoughts and prayers." : cur.type === "W" ? "Long may it continue." : "Baffling."} />}
        </div>
      </section>

      <section><SectionTitle sub="Individual brilliance, and the other thing">Player records</SectionTitle>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {mostGoalsSeason && <Card icon={<Target />} tone="good" label="Most goals in a season" value={mostGoalsSeason.goals} sub={<><PlayerLink name={mostGoalsSeason.player.name} player={mostGoalsSeason.player} /> · {mostGoalsSeason.seasonId}</>} />}
          {mostAppsSeason && <Card icon={<Medal />} tone="gold" label="Most apps in a season" value={mostAppsSeason.apps} sub={<><PlayerLink name={mostAppsSeason.player.name} player={mostAppsSeason.player} /> · {mostAppsSeason.seasonId}</>} />}
          {mostAssistsSeason && mostAssistsSeason.assists > 0 && <Card icon={<Sparkles />} label="Most assists in a season" value={mostAssistsSeason.assists} sub={<><PlayerLink name={mostAssistsSeason.player.name} player={mostAssistsSeason.player} /> · {mostAssistsSeason.seasonId}</>} />}
          {motmKing && motmKing.motm > 0 && <Card icon={<Crown />} tone="gold" label="Most MOTM awards" value={motmKing.motm} sub={<PlayerLink name={motmKing.name} player={motmKing} />} />}
          {champKing && champKing.champagne > 0 && <Card icon={<PartyPopper />} label="Most champagne moments" value={champKing.champagne} sub={<><PlayerLink name={champKing.name} player={champKing} /> · a true entertainer</>} />}
          {mostLosses && <Card icon={<Skull />} tone="bad" label="Most defeats witnessed" value={mostLosses.losses} sub={<><PlayerLink name={mostLosses.name} player={mostLosses} /> · loyalty, or masochism</>} />}
          {r.hatTricks[0] && <Card icon={<Zap />} tone="good" label="Most goals in a game" value={r.hatTricks[0].goals} sub={<><PlayerLink name={r.hatTricks[0].player} player={byName.get(r.hatTricks[0].player)} /> vs {r.hatTricks[0].match.opponent}</>} href={`/matches/${r.hatTricks[0].match.id}`} />}
          <Card icon={<Trophy />} tone="good" label="Hat-tricks" value={r.hatTricks.length} sub={r.hatTricks.length ? `by ${new Set(r.hatTricks.map((h) => h.player)).size} different player${new Set(r.hatTricks.map((h) => h.player)).size === 1 ? "" : "s"}` : "None yet"} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden"><div className="p-5 pb-2"><SectionTitle sub="Three or more in a single game">Hat-tricks</SectionTitle></div>
          {r.hatTricks.length ? <div className="overflow-x-auto"><table className="stats min-w-[520px]"><thead><tr><th>Player</th><th className="num">Goals</th><th>Match</th><th>Date</th></tr></thead><tbody>{r.hatTricks.map((h) => <tr key={`${h.match.id}-${h.player}`}><td><PlayerLink name={h.player} player={byName.get(h.player)} avatar /></td><td className="num display text-xl text-mint-soft">{h.goals}</td><td><Link href={`/matches/${h.match.id}`} className="link">{scoreline(h.match)} vs {h.match.opponent}</Link></td><td className="text-ash">{fmtDate(h.match.date, { day: "numeric", month: "short", year: "2-digit" })}</td></tr>)}</tbody></table></div> : <p className="px-5 pb-5 text-sm text-ash">Nobody has managed three in a game. Yet.</p>}
        </div>
        <div className="card overflow-hidden"><div className="p-5 pb-2"><SectionTitle sub="Played every counted game of a season (seasons of 5+ games)">Ever-presents</SectionTitle></div>
          {everPresent.length ? <table className="stats"><thead><tr><th>Player</th><th>Season</th><th className="num">Games</th></tr></thead><tbody>{everPresent.map((e) => <tr key={`${e.player.slug}-${e.season.id}`}><td><PlayerLink name={e.player.name} player={e.player} avatar /></td><td><Link href={`/seasons/${e.season.id.toLowerCase()}`} className="link">{e.season.id}</Link> <span className="text-ash">{e.season.period}</span></td><td className="num">{e.n}</td></tr>)}</tbody></table> : <p className="px-5 pb-5 text-sm text-ash">Nobody has played every game of a season. Life gets in the way. So does Thameslink.</p>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
