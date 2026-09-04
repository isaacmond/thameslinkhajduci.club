import type { ClubData, Player } from "./types";
import { attendance, chronological, currentStreak, fmtDate, goalContext, headToHead, leaderboard, pace, playedMatches, playerStreaks, scoreline, upcomingMilestones } from "./stats";
import { londonToday } from "./time";

export interface Insight { key: string; text: string; href?: string; tone: "ok" | "late" | "bad" | "muted"; weight: number }

/** Deterministic daily shuffle so the same facts don't sit in the same slots forever. */
const daySeed = () => [...londonToday()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
export function pickInsights(list: Insight[], n: number): Insight[] {
  const seed = daySeed();
  return [...list].sort((a, b) => b.weight - a.weight || ((a.key.charCodeAt(0) ^ seed) % 7) - ((b.key.charCodeAt(0) ^ seed) % 7)).slice(0, n);
}

/** Club-level talking points, weighted by how much they would get the group chat going. */
export function insights(data: ClubData): Insight[] {
  const out: Insight[] = [];
  const first = (n: string) => n.split(" ")[0];
  for (const ms of upcomingMilestones(data.players, 3).slice(0, 4)) {
    const kind = ms.kind === "apps" ? "appearance" : ms.kind === "goals" ? "goal" : ms.kind === "assists" ? "assist" : "MOTM award";
    out.push({ key: `ms-${ms.player.slug}-${ms.kind}`, text: `${ms.player.name} is ${ms.away} ${kind}${ms.away === 1 ? "" : "s"} from ${ms.target}`, href: `/squad/${ms.player.slug}`, tone: "ok", weight: 90 - ms.away * 10 + (ms.target >= 50 ? 10 : 0) });
  }
  for (const o of headToHead(data.matches).slice(0, 8)) {
    if (o.played >= 5 && o.won === 0) out.push({ key: `bogey-${o.key}`, text: `${o.played} games against ${o.opponent}, still waiting for a win`, href: `/opponents/${o.slug}`, tone: "bad", weight: 70 + o.played });
    if (o.played >= 3 && o.lost === 0) out.push({ key: `fav-${o.key}`, text: `Unbeaten in ${o.played} against ${o.opponent}`, href: `/opponents/${o.slug}`, tone: "ok", weight: 75 + o.played });
  }
  const streak = currentStreak(data.matches);
  if (streak && streak.length >= 3) out.push({ key: "streak", text: streak.type === "L" ? `${streak.length} defeats in a row. The board is monitoring the situation` : streak.type === "W" ? `${streak.length} wins on the bounce` : `${streak.length} draws running, somehow`, href: "/records", tone: streak.type === "W" ? "ok" : streak.type === "L" ? "bad" : "late", weight: 60 + streak.length * 5 });
  const current = data.seasons.find((s) => s.isCurrent);
  if (current) { const p = pace(data, current.id); if (p && p.games >= 2 && p.of > 1) out.push({ key: "pace", text: p.bestStart ? `${p.pts} points after ${p.games} games: the best start to a season yet` : p.worstStart ? `${p.pts} points after ${p.games} games: the worst start on record` : `${p.pts} points after ${p.games} games, ${p.tied ? "joint " : ""}${ordinal(p.rank)} best start of ${p.of} seasons`, href: `/seasons/${current.id.toLowerCase()}`, tone: p.bestStart ? "ok" : p.worstStart ? "bad" : "muted", weight: p.bestStart || p.worstStart ? 85 : 40 }); }
  for (const x of leaderboard(data.players, "goals").slice(0, 3)) {
    const st = playerStreaks(data, x.player.name);
    if (st.scoringRun >= 3) out.push({ key: `run-${x.player.slug}`, text: `${x.player.name} has scored in ${st.scoringRun} straight games`, href: `/squad/${x.player.slug}`, tone: "ok", weight: 65 + st.scoringRun * 3 });
    if (st.drought >= 5) out.push({ key: `drought-${x.player.slug}`, text: `${x.player.name}: ${st.drought} games without a goal`, href: `/squad/${x.player.slug}`, tone: "bad", weight: 55 + st.drought });
  }
  for (const p of data.players.filter((p) => p.apps >= 10).slice(0, 12)) {
    const st = playerStreaks(data, p.name);
    if (st.winlessRun >= 10) out.push({ key: `winless-${p.slug}`, text: `${first(p.name)} hasn't tasted victory in ${st.winlessRun} appearances`, href: `/squad/${p.slug}`, tone: "bad", weight: 50 + st.winlessRun });
  }
  const last = chronological(playedMatches(data.matches)).at(-1);
  if (last) { const gc = last.lineup.filter((l) => l.goals >= 3); for (const l of gc) out.push({ key: `hat-${last.id}-${l.player}`, text: `${l.player} hit ${l.goals} against ${last.opponent} (${scoreline(last)})`, href: `/matches/${last.id}`, tone: "ok", weight: 80 }); }
  const att = data.players.filter((p) => p.apps >= 15).map((p) => ({ p, a: attendance(data, p.name) })).filter((x) => x.a.possible >= 15).sort((a, b) => b.a.pct - a.a.pct);
  if (att[0] && att[0].a.pct >= 85) out.push({ key: "punctual", text: `${att[0].p.name} has turned up to ${att[0].a.pct}% of possible games. Set your watch by him`, href: `/squad/${att[0].p.slug}`, tone: "ok", weight: 45 });
  return out;
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ?? ["th", "st", "nd", "rd"][n % 100] ?? "th"}`;

/** Sentences for one player's page. */
export function playerInsights(data: ClubData, p: Player): string[] {
  const out: string[] = [];
  const st = playerStreaks(data, p.name), gc = goalContext(data, p.name), att = attendance(data, p.name);
  const first = p.name.split(" ")[0];
  if (st.scoringRun >= 2) out.push(`Scored in ${st.scoringRun} straight games.`);
  else if (st.drought >= 5 && p.goals > 0) out.push(`${st.drought} games without a goal. Due one.`);
  if (st.longestScoringRun >= 4) out.push(`Longest scoring run: ${st.longestScoringRun} games.`);
  if (st.winlessRun >= 8) out.push(`${st.winlessRun} appearances since ${first} last won${st.lastWin ? ` (${scoreline(st.lastWin)} vs ${st.lastWin.opponent}, ${fmtDate(st.lastWin.date, { month: "short", year: "numeric" })})` : ""}.`);
  else if (st.unbeatenRun >= 3) out.push(`Unbeaten in the last ${st.unbeatenRun} games ${first} has played.`);
  if (p.goals >= 5) {
    if (gc.consolation >= Math.ceil(p.goals / 2)) out.push(`${gc.consolation} of ${p.goals} goals were consolations in heavy defeats. Highlights reel, not the scoreboard.`);
    else if (gc.inWins >= Math.ceil(p.goals / 2)) out.push(`${gc.inWins} of ${p.goals} goals came in wins. Scores when it matters.`);
    if (gc.share !== null && gc.share >= 40) out.push(`${gc.share}% of every Hajduci goal scored with ${first} on the pitch was ${first}'s.`);
  }
  if (att.possible >= 10) out.push(att.pct >= 85 ? `Turned up to ${att.pct}% of possible games. Reliable as a Thameslink timetable isn't.` : att.pct <= 40 ? `Turned up to ${att.pct}% of possible games. A luxury player.` : `Turned up to ${att.pct}% of the games he could have.`);
  const up = upcomingMilestones([p], 3)[0];
  if (up) out.push(`${up.away} ${up.kind === "apps" ? "appearance" : up.kind === "goals" ? "goal" : up.kind === "assists" ? "assist" : "award"}${up.away === 1 ? "" : "s"} away from ${up.target}.`);
  return out.slice(0, 4);
}
