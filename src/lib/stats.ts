import type { ClubData, Match, Player, Result } from "./types";
import { londonToday } from "./time";

export const fmtDate = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", opts) : "TBC";
export const fmtMoney = (n: number) => `£${n.toFixed(2)}`;
export const scoreline = (m: Match) => (m.played ? `${m.ourGoals}–${m.theirGoals}` : "—");
export const ppg = (s: { won: number; drawn: number; played: number }) => (s.played ? +((s.won * 3 + s.drawn) / s.played).toFixed(2) : 0);
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

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

export interface OpponentRecord { opponent: string; key: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; matches: Match[]; seasons: string[] }
export const opponentKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(fc|f c|the)\b/g, "").replace(/\s+/g, " ").trim();
export function headToHead(matches: Match[]): OpponentRecord[] {
  const map = new Map<string, OpponentRecord>();
  for (const m of playedMatches(matches)) {
    const key = opponentKey(m.opponent);
    if (!key || key === "forfeit") continue;
    let r = map.get(key);
    if (!r) { r = { opponent: m.opponent, key, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, matches: [], seasons: [] }; map.set(key, r); }
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
