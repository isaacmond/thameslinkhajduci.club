import type { ClubData, Player } from "./types";
import { attendance, chronological, currentStreak, goalContext, headToHead, leaderboard, pace, playedMatches, playerStreaks, recentPlayers, scoreline, upcomingMilestones } from "./stats";
import { londonToday } from "./time";

export interface Insight { key: string; text: string; href?: string; tone: "ok" | "late" | "bad" | "muted"; weight: number }

/** Deterministic daily shuffle so the same facts don't sit in the same slots forever. */
const daySeed = () => [...londonToday()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
export function pickInsights(list: Insight[], n: number): Insight[] {
  const seed = daySeed();
  return [...list].sort((a, b) => b.weight - a.weight || ((a.key.charCodeAt(0) ^ seed) % 7) - ((b.key.charCodeAt(0) ^ seed) % 7)).slice(0, n);
}

/** Club-level facts worth surfacing, weighted by how notable they are. */
export function insights(data: ClubData): Insight[] {
  const out: Insight[] = [];
  const first = (n: string) => n.split(" ")[0];
  // Present-tense lines about people, so only people who still turn up.
  const recent = recentPlayers(data);
  for (const ms of upcomingMilestones(recent, 3).slice(0, 4)) {
    const kind = ms.kind === "apps" ? "appearance" : ms.kind === "goals" ? "goal" : ms.kind === "assists" ? "assist" : "man of the match award";
    out.push({ key: `ms-${ms.player.slug}-${ms.kind}`, text: `${ms.player.name} is ${ms.away} ${kind}${ms.away === 1 ? "" : "s"} from ${ms.target}`, href: `/squad/${ms.player.slug}`, tone: "ok", weight: 90 - ms.away * 10 + (ms.target >= 50 ? 10 : 0) });
  }
  for (const o of headToHead(data.matches).slice(0, 8)) {
    if (o.played >= 5 && o.won === 0) out.push({ key: `bogey-${o.key}`, text: `Yet to beat ${o.opponent} in ${o.played} meetings`, href: `/opponents/${o.slug}`, tone: "bad", weight: 70 + o.played });
    if (o.played >= 3 && o.lost === 0) out.push({ key: `fav-${o.key}`, text: `Unbeaten in ${o.played} against ${o.opponent}`, href: `/opponents/${o.slug}`, tone: "ok", weight: 75 + o.played });
  }
  const streak = currentStreak(data.matches);
  if (streak && streak.length >= 3) out.push({ key: "streak", text: streak.type === "L" ? `${streak.length} defeats in a row` : streak.type === "W" ? `${streak.length} wins in a row` : `${streak.length} draws in a row`, href: "/records", tone: streak.type === "W" ? "ok" : streak.type === "L" ? "bad" : "late", weight: 60 + streak.length * 5 });
  const current = data.seasons.find((s) => s.isCurrent);
  if (current) { const p = pace(data, current.id); if (p && p.games >= 2 && p.of > 1) out.push({ key: "pace", text: p.bestStart ? `${p.pts} points from ${p.games} games, the club's best start to a season` : p.worstStart ? `${p.pts} points from ${p.games} games, the slowest start to a season` : `${p.pts} points from ${p.games} games, the ${p.tied ? "joint " : ""}${ordinal(p.rank)} best start of ${p.of} seasons`, href: `/seasons/${current.id.toLowerCase()}`, tone: p.bestStart ? "ok" : p.worstStart ? "bad" : "muted", weight: p.bestStart || p.worstStart ? 85 : 40 }); }
  for (const x of leaderboard(recent, "goals").slice(0, 3)) {
    const st = playerStreaks(data, x.player.name);
    if (st.scoringRun >= 3) out.push({ key: `run-${x.player.slug}`, text: `${x.player.name} has scored in ${st.scoringRun} matches in a row`, href: `/squad/${x.player.slug}`, tone: "ok", weight: 65 + st.scoringRun * 3 });
    if (st.drought >= 5) out.push({ key: `drought-${x.player.slug}`, text: `${x.player.name} last scored ${st.drought} matches ago`, href: `/squad/${x.player.slug}`, tone: "bad", weight: 55 + st.drought });
  }
  for (const p of recent.filter((p) => p.apps >= 10).slice(0, 12)) {
    const st = playerStreaks(data, p.name);
    if (st.winlessRun >= 10) out.push({ key: `winless-${p.slug}`, text: `${first(p.name)}'s last win was ${st.winlessRun} appearances ago`, href: `/squad/${p.slug}`, tone: "bad", weight: 50 + st.winlessRun });
  }
  const last = chronological(playedMatches(data.matches)).at(-1);
  if (last) { const gc = last.lineup.filter((l) => l.goals >= 3); for (const l of gc) out.push({ key: `hat-${last.id}-${l.player}`, text: `${l.player} scored ${l.goals} against ${last.opponent} (${scoreline(last)})`, href: `/matches/${last.id}`, tone: "ok", weight: 80 }); }
  const att = recent.filter((p) => p.apps >= 15).map((p) => ({ p, a: attendance(data, p.name) })).filter((x) => x.a.possible >= 15).sort((a, b) => b.a.pct - a.a.pct);
  if (att[0] && att[0].a.pct >= 85) out.push({ key: "punctual", text: `${att[0].p.name} has played in ${att[0].a.pct}% of possible matches`, href: `/squad/${att[0].p.slug}`, tone: "ok", weight: 45 });
  return out;
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ?? ["th", "st", "nd", "rd"][n % 100] ?? "th"}`;

/** Sentences for one player's page. */
export function playerInsights(data: ClubData, p: Player): string[] {
  const out: string[] = [];
  const st = playerStreaks(data, p.name), gc = goalContext(data, p.name);
  const first = p.name.split(" ")[0];
  if (st.scoringRun >= 2) out.push(`Has scored in ${st.scoringRun} matches in a row.`);
  
  if (st.longestScoringRun >= 4) out.push(`Longest scoring run: ${st.longestScoringRun} matches.`);
  if (st.unbeatenRun >= 3) out.push(`Unbeaten in the last ${st.unbeatenRun} matches ${first} has played.`);
  if (p.goals >= 5) {
    if (gc.inWins >= Math.ceil(p.goals / 2)) out.push(`${gc.inWins} of ${p.goals} goals came in wins.`);
    if (gc.share !== null && gc.share >= 30) out.push(`Scored ${gc.share}% of the team's goals in the matches ${first} played.`);
  }
  const up = upcomingMilestones([p], 3)[0];
  if (up) out.push(`${up.away} ${up.kind === "apps" ? "appearance" : up.kind === "goals" ? "goal" : up.kind === "assists" ? "assist" : "award"}${up.away === 1 ? "" : "s"} short of ${up.target}.`);
  return out.slice(0, 4);
}
