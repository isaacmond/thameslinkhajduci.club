import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import type { Streak } from "@/lib/stats";
import { currentStreak, fmtDate, playedMatches, ppg, records, scoreline } from "@/lib/stats";
import { Empty, PageHeader, PlayerLink, RecordCard, SectionTitle, Tag } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Records", description: "Thameslink Hajduci club records: biggest wins, longest runs, hat-tricks and more." };

const season = (id: string) => (id === "FR" ? "Friendly" : `Season ${id.replace(/^S/, "")}`);
const matchSub = (m: Match) => <>v {m.opponent} · <span className="nowrap">{fmtDate(m.date)}</span></>;
const streakSub = (s: Streak) => <><span className="nowrap">{fmtDate(s.start.date, { day: "numeric", month: "short", year: "numeric" })}</span> – <span className="nowrap">{fmtDate(s.end.date, { day: "numeric", month: "short", year: "numeric" })}</span></>;

export default async function RecordsPage() {
  const data = await getData();
  const r = records(data);
    const cur = currentStreak(data.matches);
  const mostLosses = [...data.players].sort((a, b) => b.losses - a.losses)[0];
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const seasonBests = data.players.flatMap((p) => p.seasons.map((s) => ({ player: p, ...s })));
  const mostGoalsSeason = [...seasonBests].sort((a, b) => b.goals - a.goals)[0];
  const mostAppsSeason = [...seasonBests].sort((a, b) => b.apps - a.apps)[0];
  const mostAssistsSeason = [...seasonBests].sort((a, b) => b.assists - a.assists)[0];
  const motmKing = [...data.players].sort((a, b) => b.motm - a.motm)[0];
    const best = data.seasons.find((s) => s.id === r.bestSeason), worst = data.seasons.find((s) => s.id === r.worstSeason);
  // Ever-present: played every counted, scored game of a season (seasons of 5+ such games). Compared against the actual line-ups, not the apps column.
  const everPresent = data.seasons.flatMap((s) => { const counted = playedMatches(s.matches); return counted.length >= 5 ? data.players.filter((p) => counted.every((m) => m.lineup.some((l) => l.player === p.name && l.played))).map((p) => ({ player: p, season: s, n: counted.length })) : []; });
  const hatTrickPlayers = new Set(r.hatTricks.map((h) => h.player)).size;

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="The record books" title="Records" sub="The club's records, from the biggest wins to the longest runs." />

      <section><SectionTitle>Team</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {r.biggestWin && <RecordCard label="Biggest win" value={scoreline(r.biggestWin)} sub={matchSub(r.biggestWin)} href={`/matches/${r.biggestWin.id}`} />}
          {r.heaviestDefeat && <RecordCard label="Heaviest defeat" value={scoreline(r.heaviestDefeat)} sub={matchSub(r.heaviestDefeat)} href={`/matches/${r.heaviestDefeat.id}`} />}
          {r.highestScoring && <RecordCard label="Highest-scoring match" value={<>{r.highestScoring.ourGoals! + r.highestScoring.theirGoals!} <span className="text-2xl text-muted">goals</span></>} sub={<>{scoreline(r.highestScoring)} {matchSub(r.highestScoring)}</>} href={`/matches/${r.highestScoring.id}`} />}
          {r.mostGoalsScored && <RecordCard label="Most goals scored" value={r.mostGoalsScored.ourGoals} sub={<>{scoreline(r.mostGoalsScored)} {matchSub(r.mostGoalsScored)}</>} href={`/matches/${r.mostGoalsScored.id}`} />}
          {r.mostConceded && <RecordCard label="Most goals conceded" value={r.mostConceded.theirGoals} sub={<>{scoreline(r.mostConceded)} {matchSub(r.mostConceded)}</>} href={`/matches/${r.mostConceded.id}`} />}
          <RecordCard label="Clean sheets" value={r.cleanSheets.length} sub={r.cleanSheets.length ? <>{r.cleanSheets.slice(0, 3).map((m) => <Link key={m.id} href={`/matches/${m.id}`} className="mr-2 text-muted transition-colors hover:text-accent">{scoreline(m)} v {m.opponent}</Link>)}</> : undefined} />
          {best && <RecordCard label="Best season" value={season(best.id)} sub={<>{ppg(best.summary).toFixed(2)} points a game · won {best.summary.won}, drew {best.summary.drawn}, lost {best.summary.lost}</>} href={`/seasons/${best.id.toLowerCase()}`} />}
          {worst && <RecordCard label="Toughest season" value={season(worst.id)} sub={<>{ppg(worst.summary).toFixed(2)} points a game · won {worst.summary.won}, drew {worst.summary.drawn}, lost {worst.summary.lost}</>} href={`/seasons/${worst.id.toLowerCase()}`} />}
        </div>
      </section>

      <section><SectionTitle right={cur ? <Tag tone={cur.type === "W" ? "win" : cur.type === "L" ? "loss" : "default"} className="tabular" >Current run · {cur.length} {cur.type === "W" ? "win" : cur.type === "L" ? "defeat" : "draw"}{cur.length === 1 ? "" : "s"}</Tag> : undefined}>Runs</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {r.longestWin && <RecordCard label="Longest winning run" value={<>{r.longestWin.length} <span className="text-2xl text-muted">{r.longestWin.length === 1 ? "match" : "matches"}</span></>} sub={streakSub(r.longestWin)} />}
          {r.longestUnbeaten && <RecordCard label="Longest unbeaten run" value={<>{r.longestUnbeaten.length} <span className="text-2xl text-muted">{r.longestUnbeaten.length === 1 ? "match" : "matches"}</span></>} sub={streakSub(r.longestUnbeaten)} />}
          {r.longestLosing && <RecordCard label="Longest losing run" value={<>{r.longestLosing.length} <span className="text-2xl text-muted">{r.longestLosing.length === 1 ? "match" : "matches"}</span></>} sub={streakSub(r.longestLosing)} />}
          {r.longestWinless && <RecordCard label="Longest winless run" value={<>{r.longestWinless.length} <span className="text-2xl text-muted">{r.longestWinless.length === 1 ? "match" : "matches"}</span></>} sub={streakSub(r.longestWinless)} />}
        </div>
      </section>

      <section><SectionTitle>Players</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {mostGoalsSeason && <RecordCard label="Most goals in a season" value={mostGoalsSeason.goals} sub={<><PlayerLink name={mostGoalsSeason.player.name} player={mostGoalsSeason.player} /> · {season(mostGoalsSeason.seasonId)}</>} />}
          {mostAppsSeason && <RecordCard label="Most appearances in a season" value={mostAppsSeason.apps} sub={<><PlayerLink name={mostAppsSeason.player.name} player={mostAppsSeason.player} /> · {season(mostAppsSeason.seasonId)}</>} />}
          {mostAssistsSeason && mostAssistsSeason.assists > 0 && <RecordCard label="Most assists in a season" value={mostAssistsSeason.assists} sub={<><PlayerLink name={mostAssistsSeason.player.name} player={mostAssistsSeason.player} /> · {season(mostAssistsSeason.seasonId)}</>} />}
          {motmKing && motmKing.motm > 0 && <RecordCard label="Most man of the match awards" value={motmKing.motm} sub={<PlayerLink name={motmKing.name} player={motmKing} />} />}
                    {mostLosses && <RecordCard label="Most defeats played in" value={mostLosses.losses} sub={<PlayerLink name={mostLosses.name} player={mostLosses} />} />}
          {r.hatTricks[0] && <RecordCard label="Most goals in a match" value={r.hatTricks[0].goals} sub={<><PlayerLink name={r.hatTricks[0].player} player={byName.get(r.hatTricks[0].player)} /> v {r.hatTricks[0].match.opponent}</>} href={`/matches/${r.hatTricks[0].match.id}`} />}
          <div className="xl:col-span-2"><RecordCard label="Hat-tricks" value={r.hatTricks.length} sub={r.hatTricks.length ? `by ${hatTrickPlayers} player${hatTrickPlayers === 1 ? "" : "s"}` : "None yet"} /></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden"><div className="p-6 pb-2"><SectionTitle sub="Three or more in a match">Hat-tricks</SectionTitle></div>
          {r.hatTricks.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full table-fixed">
                <thead><tr><th className="w-[42%]">Player</th><th className="num w-16">Goals</th><th>Match</th></tr></thead>
                <tbody>{r.hatTricks.map((h) => <tr key={`${h.match.id}-${h.player}`}><td className="h-16"><PlayerLink name={h.player} player={byName.get(h.player)} avatar /></td><td className="num font-semibold">{h.goals}</td><td className="truncate"><Link href={`/matches/${h.match.id}`} className="link block max-w-full truncate align-bottom" title={`${scoreline(h.match)} v ${h.match.opponent}`}>{scoreline(h.match)} v {h.match.opponent}</Link><span className="block text-xs text-muted">{fmtDate(h.match.date)}</span></td></tr>)}</tbody>
              </table>
            </div>
          ) : <Empty inset>No hat-tricks yet.</Empty>}
        </div>
        <div className="card overflow-hidden"><div className="p-6 pb-2"><SectionTitle sub="Played every match of a season">Ever-presents</SectionTitle></div>
          {everPresent.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full"><thead><tr><th>Player</th><th>Season</th><th className="num">Matches</th></tr></thead><tbody>{everPresent.map((e) => <tr key={`${e.player.slug}-${e.season.id}`}><td className="h-16"><PlayerLink name={e.player.name} player={e.player} avatar /></td><td><Link href={`/seasons/${e.season.id.toLowerCase()}`} className="link">{season(e.season.id)}</Link><span className="block text-xs text-muted">{e.season.period}</span></td><td className="num">{e.n}</td></tr>)}</tbody></table>
            </div>
          ) : <Empty inset>No one has played every match of a season yet.</Empty>}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
