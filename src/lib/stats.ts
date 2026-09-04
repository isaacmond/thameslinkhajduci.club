import type { ClubData, Match, MatchLite, Player, Result, Season } from "./types";
import { londonToday } from "./time";

export const fmtDate = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", opts) : "TBC";
export const fmtMoney = (n: number) => `£${n.toFixed(2)}`;
export const scoreline = (m: Pick<Match, "played" | "ourGoals" | "theirGoals">) => (m.played ? `${m.ourGoals}–${m.theirGoals}` : "—");
export const ppg = (s: { won: number; drawn: number; played: number }) => (s.played ? +((s.won * 3 + s.drawn) / s.played).toFixed(2) : 0);
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
/** Strip a match to what the client-side browser renders and searches on. */
export const toLite = (m: Match): MatchLite => { const { lineup, matchCost, playersInGame, costPerPlayer, ...rest } = m; void matchCost; void playersInGame; void costPerPlayer; return { ...rest, lineup: lineup.filter((l) => l.played || l.goals > 0).map((l) => ({ player: l.player, played: l.played, goals: l.goals })) }; };
/** "GW3" for league games, "Friendly 3" for the friendlies tab. */
export const gwLabel = (m: { seasonId: string; gw: number }) => (m.seasonId === "FR" ? `Friendly ${m.gw}` : `GW${m.gw}`);
export const seasonHref = (seasonId: string) => (seasonId === "FR" ? "/seasons/friendlies" : `/seasons/${seasonId.toLowerCase()}`);

export function playedMatches(matches: Match[]) {
  return matches.filter((m) => m.countsForRecords && m.played);
}
export function chronological(matches: Match[]) {
  return [...matches].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.seasonNumber - b.seasonNumber || a.gw - b.gw);
}

export interface Streak { type: Result | "unbeaten" | "winless"; length: number; start: Match; end: Match }

export function longestStreak(matches: Match[], pred: (r: Result) => boolean, label: Streak["type"]): Streak | null {
  const ms = chronological(playedMatches(matches));
  let best: Streak | null = null; let cur: Match[] = [];
  const flush = () => { if (cur.length && (!best || cur.length > best.length)) best = { type: label, length: cur.length, start: cur[0], end: cur[cur.length - 1] }; cur = []; };
  for (const m of ms) { if (m.result && pred(m.result)) cur.push(m); else flush(); }
  flush();
  return best;
}
export function currentStreak(matches: Match[]): { type: Result; length: number } | null {
  const ms = chronological(playedMatches(matches)).reverse();
  if (!ms.length || !ms[0].result) return null;
  const t = ms[0].result; let n = 0;
  for (const m of ms) { if (m.result === t) n++; else break; }
  return { type: t, length: n };
}
export function form(matches: Match[], n = 5): Match[] {
  return chronological(playedMatches(matches)).slice(-n);
}

export interface OpponentRecord { opponent: string; key: string; slug: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; matches: Match[]; seasons: string[] }
export const opponentKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(fc|f c|the)\b/g, "").replace(/\s+/g, " ").trim();
export function headToHead(matches: Match[]): OpponentRecord[] {
  const map = new Map<string, OpponentRecord>();
  for (const m of playedMatches(matches)) {
    const key = opponentKey(m.opponent);
    if (!key || key === "forfeit") continue;
    let r = map.get(key);
    if (!r) { r = { opponent: m.opponent, key, slug: key.replace(/\s+/g, "-"), played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, matches: [], seasons: [] }; map.set(key, r); }
    r.played++; r.gf += m.ourGoals!; r.ga += m.theirGoals!;
    if (m.result === "W") r.won++; else if (m.result === "D") r.drawn++; else r.lost++;
    r.matches.push(m); if (!r.seasons.includes(m.seasonId)) r.seasons.push(m.seasonId);
    // prefer the most common / most recent capitalisation
    r.opponent = m.opponent;
  }
  return [...map.values()].sort((a, b) => b.played - a.played || a.opponent.localeCompare(b.opponent));
}

export interface Records {
  biggestWin: Match | null; heaviestDefeat: Match | null; highestScoring: Match | null; mostGoalsScored: Match | null; mostConceded: Match | null;
  cleanSheets: Match[]; longestWin: Streak | null; longestLosing: Streak | null; longestUnbeaten: Streak | null; longestWinless: Streak | null;
  hatTricks: { player: string; goals: number; match: Match }[]; bestSeason: string | null; worstSeason: string | null;
}
export function records(data: ClubData): Records {
  const ms = playedMatches(data.matches);
  const margin = (m: Match) => m.ourGoals! - m.theirGoals!;
  const by = (f: (m: Match) => number) => (ms.length ? [...ms].sort((a, b) => f(b) - f(a) || (b.date ?? "").localeCompare(a.date ?? ""))[0] : null);
  const hatTricks = ms.flatMap((m) => m.lineup.filter((l) => l.goals >= 3).map((l) => ({ player: l.player, goals: l.goals, match: m }))).sort((a, b) => b.goals - a.goals || (b.match.date ?? "").localeCompare(a.match.date ?? ""));
  const seasonsWithGames = data.seasons.filter((s) => s.summary.played >= 3);
  const ppg = (s: typeof data.seasons[number]) => (s.summary.won * 3 + s.summary.drawn) / Math.max(1, s.summary.played);
  const sorted = [...seasonsWithGames].sort((a, b) => ppg(b) - ppg(a));
  return {
    biggestWin: ms.some((m) => margin(m) > 0) ? by(margin) : null,
    heaviestDefeat: by((m) => -margin(m)),
    highestScoring: by((m) => m.ourGoals! + m.theirGoals!),
    mostGoalsScored: by((m) => m.ourGoals!),
    mostConceded: by((m) => m.theirGoals!),
    cleanSheets: ms.filter((m) => m.theirGoals === 0),
    longestWin: longestStreak(data.matches, (r) => r === "W", "W"),
    longestLosing: longestStreak(data.matches, (r) => r === "L", "L"),
    longestUnbeaten: longestStreak(data.matches, (r) => r !== "L", "unbeaten"),
    longestWinless: longestStreak(data.matches, (r) => r !== "W", "winless"),
    hatTricks, bestSeason: sorted[0]?.id ?? null, worstSeason: sorted[sorted.length - 1]?.id ?? null,
  };
}

export type LeaderKey = "apps" | "goals" | "assists" | "motm" | "goalsPerGame" | "assistsPerGame" | "winRate" | "ga";
/** Ranked players by a stat. For per-game rates the minimum applies to the games actually in the denominator (games with scorers/assists logged), not raw apps. */
export function leaderboard(players: Player[], key: LeaderKey, minApps = 0): { player: Player; value: number }[] {
  return players
    .filter((p) => (key === "goalsPerGame" ? p.gpgGames : key === "assistsPerGame" ? p.apgGames : p.apps) >= minApps)
    .map((p) => ({ player: p, value: key === "ga" ? p.goals + p.assists : (p[key] as number) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || b.player.apps - a.player.apps || a.player.name.localeCompare(b.player.name));
}

/** Player stats restricted to a single season. */
export function seasonPlayers(data: ClubData, seasonId: string): Player[] {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) return [];
  const map = new Map<string, Player>();
  for (const base of data.players) {
    const ps = base.seasons.find((x) => x.seasonId === seasonId);
    if (!ps) continue;
    let w = 0, d = 0, l = 0;
    for (const m of season.matches) if (m.countsForRecords && m.played && m.lineup.some((x) => x.player === base.name && x.played)) { if (m.result === "W") w++; else if (m.result === "D") d++; else l++; }
    const decided = w + d + l;
    map.set(base.name, { ...base, apps: ps.apps, gpgGames: ps.gpgGames, apgGames: ps.apgGames, goals: ps.goals, assists: ps.assists, motm: ps.motm, wins: w, draws: d, losses: l, goalsPerGame: ps.gpgGames ? +(ps.goals / ps.gpgGames).toFixed(2) : 0, assistsPerGame: ps.apgGames ? +(ps.assists / ps.apgGames).toFixed(2) : 0, winRate: decided ? +((w / decided) * 100).toFixed(1) : 0, seasons: [ps] });
  }
  return [...map.values()].sort((a, b) => b.apps - a.apps || b.goals - a.goals);
}

/** Who plays with whom: pairs with most shared appearances and their win rate together. */
export function chemistry(matches: Match[], minShared = 3) {
  const pairs = new Map<string, { a: string; b: string; shared: number; wins: number; goals: number }>();
  for (const m of playedMatches(matches)) {
    const names = m.lineup.filter((l) => l.played).map((l) => l.player).sort();
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const k = `${names[i]}|${names[j]}`;
      let p = pairs.get(k); if (!p) { p = { a: names[i], b: names[j], shared: 0, wins: 0, goals: 0 }; pairs.set(k, p); }
      p.shared++; if (m.result === "W") p.wins++; p.goals += m.ourGoals!;
    }
  }
  return [...pairs.values()].filter((p) => p.shared >= minShared).map((p) => ({ ...p, winRate: +((p.wins / p.shared) * 100).toFixed(0), gpg: +(p.goals / p.shared).toFixed(2) })).sort((a, b) => b.shared - a.shared);
}

/** Team win rate with vs without a given player (min sample). */
export function impact(data: ClubData, player: string) {
  const ms = playedMatches(data.matches);
  const withP = ms.filter((m) => m.lineup.some((l) => l.player === player && l.played));
  const without = ms.filter((m) => !m.lineup.some((l) => l.player === player && l.played));
  const rate = (xs: Match[]) => (xs.length ? +((xs.filter((m) => m.result === "W").length / xs.length) * 100).toFixed(0) : null);
  const gd = (xs: Match[]) => (xs.length ? +(xs.reduce((s, m) => s + (m.ourGoals! - m.theirGoals!), 0) / xs.length).toFixed(2) : null);
  return { withGames: withP.length, withoutGames: without.length, winRateWith: rate(withP), winRateWithout: rate(without), gdWith: gd(withP), gdWithout: gd(without) };
}

export function seasonSeries(data: ClubData) {
  return data.seasons.map((s) => ({ season: s.id, name: `Season ${s.number}`, played: s.summary.played, won: s.summary.won, drawn: s.summary.drawn, lost: s.summary.lost, gf: s.summary.goalsFor, ga: s.summary.goalsAgainst, gd: s.summary.goalsFor - s.summary.goalsAgainst, ppg: s.summary.played ? +(((s.summary.won * 3 + s.summary.drawn) / s.summary.played)).toFixed(2) : 0, winPct: s.summary.played ? Math.round((s.summary.won / s.summary.played) * 100) : 0, avgFor: s.summary.played ? +(s.summary.goalsFor / s.summary.played).toFixed(1) : 0, avgAgainst: s.summary.played ? +(s.summary.goalsAgainst / s.summary.played).toFixed(1) : 0 }));
}

export function nextFixture(data: ClubData): Match | null {
  const today = londonToday();
  return chronological(data.matches).find((m) => !m.played && m.date !== null && m.date >= today) ?? null;
}
/** Most recent game that counts (same population as form() and currentStreak(), so the board never contradicts the form strip). */
export function lastResult(data: ClubData): Match | null {
  const ms = chronological(playedMatches(data.matches));
  return ms[ms.length - 1] ?? null;
}
export function scorersFor(m: Match) { return m.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals); }
export function assistersFor(m: Match) { return m.lineup.filter((l) => l.assists > 0).sort((a, b) => b.assists - a.assists); }
export function initials(name: string) { return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

/* ------------------------------------------------------------------ */
/* Deeper stats: milestones, personal streaks, goal context, attendance, races. All pure. */

export const MILESTONES = { apps: [25, 50, 75, 100, 150, 200], goals: [10, 25, 50, 75, 100, 150], assists: [10, 25, 50], motm: [5, 10, 20] } as const;
export type MilestoneKind = keyof typeof MILESTONES;
/** Players within `within` of their next round number, nearest first. */
export function upcomingMilestones(players: Player[], within = 3): { player: Player; kind: MilestoneKind; target: number; away: number }[] {
  const out: { player: Player; kind: MilestoneKind; target: number; away: number }[] = [];
  for (const p of players) for (const kind of Object.keys(MILESTONES) as MilestoneKind[]) {
    const have = p[kind]; const target = MILESTONES[kind].find((t) => t > have);
    if (target && target - have <= within && have > 0) out.push({ player: p, kind, target, away: target - have });
  }
  return out.sort((a, b) => a.away - b.away || b.player.apps - a.player.apps);
}

export interface PlayerStreaks { scoringRun: number; longestScoringRun: number; drought: number; unbeatenRun: number; winlessRun: number; lastWin: Match | null }
/** Personal runs, over counted games the player played. Scoring runs only look at games where scorers were logged. */
export function playerStreaks(data: ClubData, name: string): PlayerStreaks {
  const mine = chronological(playedMatches(data.matches)).filter((m) => m.lineup.some((l) => l.player === name && l.played));
  let scoringRun = 0, longest = 0, cur = 0, drought = 0, unbeaten = 0, winless = 0, lastWin: Match | null = null;
  for (const m of mine) {
    if (m.scorersRecorded) { const g = m.lineup.find((l) => l.player === name)?.goals ?? 0; if (g > 0) { cur++; drought = 0; } else { cur = 0; drought++; } longest = Math.max(longest, cur); }
  }
  scoringRun = cur;
  for (let i = mine.length - 1; i >= 0; i--) { if (mine[i].result !== "L") unbeaten++; else break; }
  for (let i = mine.length - 1; i >= 0; i--) { if (mine[i].result !== "W") winless++; else break; }
  for (let i = mine.length - 1; i >= 0; i--) if (mine[i].result === "W") { lastWin = mine[i]; break; }
  return { scoringRun, longestScoringRun: longest, drought, unbeatenRun: unbeaten, winlessRun: winless, lastWin };
}

export interface GoalContext { inWins: number; inDraws: number; inLosses: number; consolation: number; tight: number; share: number | null }
/** Where a player's goals came: in wins, in defeats, consolation goals in heavy defeats, goals in one-goal games, and their share of the team's goals when playing. */
export function goalContext(data: ClubData, name: string): GoalContext {
  const c: GoalContext = { inWins: 0, inDraws: 0, inLosses: 0, consolation: 0, tight: 0, share: null };
  let team = 0, own = 0;
  for (const m of playedMatches(data.matches)) {
    const l = m.lineup.find((x) => x.player === name); if (!l || !l.played) continue;
    if (!m.scorersRecorded) continue;
    team += m.ourGoals ?? 0; own += l.goals;
    if (!l.goals) continue;
    if (m.result === "W") c.inWins += l.goals; else if (m.result === "D") c.inDraws += l.goals; else c.inLosses += l.goals;
    if (m.result === "L" && (m.theirGoals ?? 0) - (m.ourGoals ?? 0) >= 4) c.consolation += l.goals;
    if (Math.abs((m.ourGoals ?? 0) - (m.theirGoals ?? 0)) <= 1) c.tight += l.goals;
  }
  c.share = team ? Math.round((own / team) * 100) : null;
  return c;
}

/** Appearances as a share of the counted games between the player's debut and last game (or to date, while they are still turning out this season). Season tabs list the whole squad, so the roster says nothing about who was around. */
export function attendance(data: ClubData, name: string): { possible: number; apps: number; pct: number } {
  const p = data.players.find((x) => x.name === name);
  if (!p?.debut || !p.lastPlayed) return { possible: 0, apps: 0, pct: 0 };
  const debut = p.debut, lastPlayed = p.lastPlayed, cur = data.seasons.find((s) => s.isCurrent);
  const active = !!cur && p.seasons.some((x) => x.seasonId === cur.id && x.apps > 0);
  const games = playedMatches(data.matches).filter((m) => m.date && m.date >= debut && (active || m.date <= lastPlayed));
  const apps = games.filter((m) => m.lineup.some((l) => l.player === name && l.played)).length;
  return { possible: games.length, apps, pct: pct(apps, games.length) };
}
/** Players who have turned out within the last `days` (London time): the ones club-level, present-tense lines should be about. Player pages stay unfiltered. */
export const recentPlayers = (data: ClubData, days = 150) => { const cutoff = new Date(Date.parse(`${londonToday()}T12:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10); return data.players.filter((p) => p.lastPlayed !== null && p.lastPlayed >= cutoff); };

/** Cumulative points after each counted game, per season, for the points-race chart. */
export function pointsProgression(data: ClubData): { seasonId: string; number: number; pts: number[] }[] {
  return data.seasons.filter((s) => s.summary.played > 0).map((s) => {
    let t = 0; const pts = chronological(playedMatches(s.matches)).map((m) => (t += m.result === "W" ? 3 : m.result === "D" ? 1 : 0));
    return { seasonId: s.id, number: s.number, pts };
  });
}
/** How the current season's start compares with every previous season at the same point. */
export function pace(data: ClubData, seasonId: string): { games: number; pts: number; rank: number; tied: number; of: number; bestStart: boolean; worstStart: boolean } | null {
  const all = pointsProgression(data); const me = all.find((s) => s.seasonId === seasonId);
  if (!me || !me.pts.length) return null;
  const g = me.pts.length, mine = me.pts[g - 1];
  const others = all.filter((s) => s.seasonId !== seasonId && s.pts.length >= g).map((s) => s.pts[g - 1]);
  const rank = 1 + others.filter((p) => p > mine).length, tied = others.filter((p) => p === mine).length;
  return { games: g, pts: mine, rank, tied, of: others.length + 1, bestStart: others.length > 0 && others.every((p) => p < mine), worstStart: others.length > 0 && others.every((p) => p > mine) };
}

/** Cumulative goals by gameweek for a season's top scorers (only games with scorers logged advance the race). */
export function goalRace(data: ClubData, season: Season, top = 5): { rows: Record<string, number | string>[]; players: string[] } {
  const games = chronological(playedMatches(season.matches)).filter((m) => m.scorersRecorded);
  const players = leaderboard(seasonPlayers(data, season.id), "goals").slice(0, top).map((x) => x.player.name);
  const totals: Record<string, number> = Object.fromEntries(players.map((p) => [p, 0]));
  const rows: Record<string, number | string>[] = [{ label: "Start", ...totals }];
  for (const m of games) { for (const p of players) totals[p] += m.lineup.find((l) => l.player === p)?.goals ?? 0; rows.push({ label: `GW${m.gw}`, ...totals }); }
  return { rows, players };
}

export interface Preview { win: number; draw: number; loss: number; expectedFor: number; expectedAgainst: number; sample: number; h2h: OpponentRecord | null }
const poisson = (k: number, l: number) => (Math.exp(-l) * Math.pow(l, k)) / [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000][k];
/** A tongue-in-cheek pre-match forecast: Poisson on recent scoring rates, nudged by the head-to-head record. */
export function preview(data: ClubData, m: Match): Preview {
  const recent = chronological(playedMatches(data.matches)).slice(-10);
  const h2h = headToHead(data.matches).find((o) => o.key === opponentKey(m.opponent)) ?? null;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  let lf = avg(recent.map((x) => x.ourGoals ?? 0)), la = avg(recent.map((x) => x.theirGoals ?? 0));
  if (h2h && h2h.played >= 2) { lf = 0.7 * lf + 0.3 * (h2h.gf / h2h.played); la = 0.7 * la + 0.3 * (h2h.ga / h2h.played); }
  lf = Math.min(Math.max(lf, 0.3), 12); la = Math.min(Math.max(la, 0.3), 12);
  let win = 0, draw = 0, loss = 0;
  for (let a = 0; a <= 15; a++) for (let b = 0; b <= 15; b++) { const p = poisson(a, lf) * poisson(b, la); if (a > b) win += p; else if (a === b) draw += p; else loss += p; }
  const norm = win + draw + loss;
  return { win: Math.round((win / norm) * 100), draw: Math.round((draw / norm) * 100), loss: Math.round((loss / norm) * 100), expectedFor: +lf.toFixed(1), expectedAgainst: +la.toFixed(1), sample: recent.length, h2h };
}
