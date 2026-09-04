import { slugify } from "./slug";
import { londonToday } from "./time";
import staticExtras from "./squad-extras.json";
import type { ClubData, Match, MoneyRow, Payment, Player, PlayerSeasonStats, Season, SeasonSummary, SquadExtra } from "./types";

/** A photo is a bundled file under public/players or an https link. The OG image reads local photos from disk, so nothing else the sheet says may reach it. */
export function photoAllowed(s: string) {
  if (/^\/players\/[a-z0-9-]+\.(jpe?g|png|webp)$/.test(s)) return true;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}
/** Photo values dropped by photoAllowed() on the last parse, by player, so the health report can point the admin at them. */
export const rejectedPhotos = new Map<string, string>();
export function safePhoto(name: string, v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  if (photoAllowed(v)) return v;
  rejectedPhotos.set(name, v);
  return undefined;
}


/**
 * Turning parsed seasons, profiles, money and payments into the ClubData every page reads. Pure: no I/O, no Google, no
 * database. The sheet parser and the database loader both end here, so the two never disagree about a stat.
 */

export function buildPlayers(seasons: Season[], extras: Map<string, SquadExtra>): Player[] {
  const map = new Map<string, Player>();
  const get = (name: string) => {
    let p = map.get(name);
    if (!p) {
      p = { name, slug: slugify(name), apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0, goalsPerGame: 0, assistsPerGame: 0, gpgGames: 0, apgGames: 0, winRate: 0, debut: null, lastPlayed: null, seasons: [], extra: extras.get(name) ?? {} };
      map.set(name, p);
    }
    return p;
  };
  for (const s of seasons) {
    const perSeason = new Map<string, PlayerSeasonStats>();
    const ps = (name: string) => {
      let x = perSeason.get(name);
      if (!x) { x = { seasonId: s.id, apps: 0, gpgGames: 0, apgGames: 0, goals: 0, assists: 0, motm: 0, cost: 0 }; perSeason.set(name, x); }
      return x;
    };
    const roster = new Set(s.players);
    for (const name of s.players) { get(name); }
    for (const m of s.matches) {
      for (const l of m.lineup) {
        const p = get(l.player); const x = ps(l.player);
        x.cost += l.cost;
        if (!m.countsForRecords) continue;
        if (l.played) {
          x.apps++; p.apps++;
          if (m.played && m.scorersRecorded) { x.gpgGames++; p.gpgGames++; }
          if (m.played && m.assistsRecorded) { x.apgGames++; p.apgGames++; }
          if (m.played) { if (m.result === "W") p.wins++; else if (m.result === "D") p.draws++; else if (m.result === "L") p.losses++; }
          if (m.date) { if (!p.debut || m.date < p.debut) p.debut = m.date; if (!p.lastPlayed || m.date > p.lastPlayed) p.lastPlayed = m.date; }
        }
        x.goals += l.goals; p.goals += l.goals; x.assists += l.assists; p.assists += l.assists;
      }
      // Awards only count for people on the season's roster; a typo or a guest in the MOTM cell must not mint a new squad member.
      if (m.countsForRecords && m.motm && roster.has(m.motm)) { const p = get(m.motm); p.motm++; ps(m.motm).motm++; }
    }
    for (const [name, x] of perSeason) { if (x.apps || x.goals || x.assists || x.motm) get(name).seasons.push(x); }
  }
  for (const p of map.values()) {
    p.goalsPerGame = p.gpgGames ? +(p.goals / p.gpgGames).toFixed(2) : 0;
    p.assistsPerGame = p.apgGames ? +(p.assists / p.apgGames).toFixed(2) : 0;
    const decided = p.wins + p.draws + p.losses;
    p.winRate = decided ? +((p.wins / decided) * 100).toFixed(1) : 0;
  }
  return [...map.values()].filter((p) => p.apps > 0 || p.goals > 0 || p.assists > 0 || p.motm > 0).sort((a, b) => b.apps - a.apps || b.goals - a.goals || a.name.localeCompare(b.name));
}


export const STATIC_EXTRAS: Record<string, { shirt: number | null; positions: string[]; photo: string | null }> = staticExtras;

/** Bundled profile extras (from the old team app) as a baseline; profile data from the sheet or the database overrides field by field. */
export function mergeExtras(fromSheet: Map<string, SquadExtra>, canonicalName: (s: string) => string, safePhoto: (name: string, v: string | null | undefined) => string | undefined): Map<string, SquadExtra> {
  const merged = new Map<string, SquadExtra>();
  for (const [name, e] of Object.entries(STATIC_EXTRAS)) { const who = canonicalName(name); merged.set(who, { shirt: e.shirt, positions: e.positions, photo: safePhoto(who, e.photo) }); }
  for (const [name, e] of fromSheet) {
    const base = merged.get(name) ?? {};
    const clean = Object.fromEntries(Object.entries({ ...e, photo: safePhoto(name, e.photo) }).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)));
    merged.set(name, { ...base, ...clean });
  }
  return merged;
}


/**
 * Whoever is named in a season's "Paid by" cell has paid the pitch hire for that season's played games.
 * The sheet's Paid column may or may not include that (the corrected workbook does); if it doesn't, add it here
 * so the payer shows as owed money rather than owing their own share.
 */
export function creditPitchPayers(seasons: Season[], money: { paidBy: Record<string, string>; rows: MoneyRow[] }) {
  const covered = new Map<string, number>();
  for (const s of seasons) {
    const payer = money.paidBy[s.id] ?? s.summary.paidBy ?? null;
    if (!payer) continue;
    const cost = s.matches.filter((m) => m.played && m.playersInGame > 0).reduce((t, m) => t + m.matchCost, 0);
    if (cost > 0) covered.set(payer, (covered.get(payer) ?? 0) + cost);
  }
  for (const [payer, cost] of covered) {
    let row = money.rows.find((r) => r.player === payer);
    if (!row) { row = { player: payer, charges: {}, totalCharged: 0, paid: 0, balance: 0, pitchCovered: 0 }; money.rows.push(row); }
    row.pitchCovered = cost;
    if (row.paid + 0.005 < cost) { row.paid += cost; row.balance = row.totalCharged - row.paid; }
  }
}


/** W/D/L and goals for a season, recomputed from the counted matches so the site never disagrees with itself. */
export function recomputeSummary(matches: Match[], summary: SeasonSummary): SeasonSummary {
  const counted = matches.filter((m) => m.countsForRecords && m.played);
  return {
    ...summary,
    played: counted.length,
    won: counted.filter((m) => m.result === "W").length,
    drawn: counted.filter((m) => m.result === "D").length,
    lost: counted.filter((m) => m.result === "L").length,
    goalsFor: counted.reduce((s, m) => s + (m.ourGoals ?? 0), 0),
    goalsAgainst: counted.reduce((s, m) => s + (m.theirGoals ?? 0), 0),
  };
}

/** A season is complete when it has fixtures, none of them lie ahead, and every one is played or in the past. */
export function seasonComplete(matches: Match[], today: string = londonToday()): boolean {
  const future = matches.filter((m) => !m.played && m.date && m.date >= today);
  return matches.length > 0 && future.length === 0 && matches.every((m) => m.played || (m.date !== null && m.date < today));
}

/** The result for a scoreline, or null when it has not been played. */
export const resultOf = (og: number | null, tg: number | null) => (og === null || tg === null ? null : og > tg ? "W" : og < tg ? "L" : "D");

export type MoneyInput = { paidBy: Record<string, string>; rows: MoneyRow[] };

export function assembleClubData(input: { seasons: Season[]; friendlies: Season | null; extras: Map<string, SquadExtra>; money: MoneyInput; payments: Payment[]; sheetUrl: string; fetchedAt?: string }): ClubData {
  const seasons = [...input.seasons].sort((a, b) => a.number - b.number);
  const { friendlies } = input;
  for (const s of seasons) s.isCurrent = false;
  // Current season: the one whose fixtures span today; else the one with the nearest upcoming fixture; else the latest with a result.
  const today = londonToday();
  const spans = seasons.filter((s) => s.matches.some((m) => m.date && m.date <= today) && s.matches.some((m) => !m.played && m.date && m.date >= today));
  const upcoming = seasons.filter((s) => s.matches.some((m) => !m.played && m.date && m.date >= today)).sort((a, b) => (a.matches.find((m) => m.date && m.date >= today)?.date ?? "9999").localeCompare(b.matches.find((m) => m.date && m.date >= today)?.date ?? "9999"));
  const current = spans[spans.length - 1] ?? upcoming[0] ?? [...seasons].reverse().find((s) => s.matches.some((m) => m.played)) ?? seasons[seasons.length - 1];
  if (current) current.isCurrent = true;
  const matches = [...seasons, ...(friendlies ? [friendlies] : [])].flatMap((s) => s.matches).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.seasonNumber - b.seasonNumber || a.gw - b.gw);
  const players = buildPlayers(seasons, input.extras);
  const money = { paidBy: { ...input.money.paidBy }, rows: input.money.rows.map((r) => ({ ...r, charges: { ...r.charges } })) };
  creditPitchPayers([...seasons, ...(friendlies ? [friendlies] : [])], money);
  const allTime: SeasonSummary = seasons.reduce((acc, s) => ({
    ...acc, played: acc.played + s.summary.played, won: acc.won + s.summary.won, drawn: acc.drawn + s.summary.drawn, lost: acc.lost + s.summary.lost,
    goalsFor: acc.goalsFor + s.summary.goalsFor, goalsAgainst: acc.goalsAgainst + s.summary.goalsAgainst, seasonCost: acc.seasonCost + s.summary.seasonCost,
  }), { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, topScorer: null, mostApps: null, seasonCost: 0, paidBy: null } as SeasonSummary);
  allTime.topScorer = players.length ? `${[...players].sort((a, b) => b.goals - a.goals)[0].name}` : null;
  allTime.mostApps = players.length ? players[0].name : null;
  return { fetchedAt: input.fetchedAt ?? new Date().toISOString(), sheetUrl: input.sheetUrl, seasons, friendlies, matches, players, money: { ...money, payments: input.payments }, allTime };
}
