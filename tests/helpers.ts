import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { slugify } from "@/lib/slug";
import type { ClubData, Match, Player, PlayerMatchLine, Season, SeasonSummary } from "@/lib/types";

/** The committed workbook snapshot, as the ArrayBuffer parseWorkbook() wants. */
export function fixtureWorkbook(): ArrayBuffer {
  const b = readFileSync(fileURLToPath(new URL("./fixtures/sheet.xlsx", import.meta.url)));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export const line = (player: string, goals = 0, assists = 0, played = true): PlayerMatchLine => ({ player, played, goals, assists, cost: 0 });

let gwCounter = 0;
/** A Match with the same derived flags the parser would set, so tests only state what matters. */
export function match(o: Partial<Match> & { date: string }): Match {
  const seasonId = o.seasonId ?? "S1";
  const gw = o.gw ?? ++gwCounter;
  const ourGoals = o.ourGoals ?? null, theirGoals = o.theirGoals ?? null;
  const played = o.played ?? (ourGoals !== null && theirGoals !== null);
  const result = o.result !== undefined ? o.result : played ? (ourGoals! > theirGoals! ? "W" : ourGoals! < theirGoals! ? "L" : "D") : null;
  const type = o.type ?? null;
  const lineup = o.lineup ?? [];
  const goalsLogged = lineup.reduce((t, l) => t + l.goals, 0);
  const assistsLogged = lineup.reduce((t, l) => t + l.assists, 0);
  return {
    id: o.id ?? `${seasonId.toLowerCase()}-gw${gw}`,
    seasonId,
    seasonNumber: o.seasonNumber ?? (seasonId === "FR" ? 0 : Number(seasonId.slice(1))),
    gw,
    date: o.date,
    kickOff: o.kickOff ?? "19:35",
    opponent: o.opponent ?? "Old Ivy",
    ourGoals, theirGoals, result, played,
    motm: o.motm ?? null,
    comment: o.comment ?? null,
    type,
    countsForRecords: o.countsForRecords ?? (!type && seasonId !== "FR"),
    scorersRecorded: o.scorersRecorded ?? (ourGoals === 0 || goalsLogged > 0),
    assistsRecorded: o.assistsRecorded ?? (ourGoals === 0 || assistsLogged > 0),
    matchCost: o.matchCost ?? 0,
    playersInGame: o.playersInGame ?? lineup.filter((l) => l.played).length,
    costPerPlayer: o.costPerPlayer ?? 0,
    lineup,
  };
}

export function player(o: Partial<Player> & { name: string }): Player {
  return {
    slug: slugify(o.name), apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0, goalsPerGame: 0, assistsPerGame: 0, gpgGames: 0, apgGames: 0, winRate: 0, debut: null, lastPlayed: null, seasons: [], extra: {},
    ...o,
  };
}

const emptySummary = (): SeasonSummary => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, topScorer: null, mostApps: null, seasonCost: 0, paidBy: null });

/** ClubData built from a handful of matches: one Season per seasonId, summaries recomputed the way the parser does. */
export function club(matches: Match[], players: Player[] = [], extra: Partial<ClubData> = {}): ClubData {
  const bySeason = new Map<string, Match[]>();
  for (const m of matches) bySeason.set(m.seasonId, [...(bySeason.get(m.seasonId) ?? []), m]);
  const seasons: Season[] = [];
  let friendlies: Season | null = null;
  for (const [id, ms] of bySeason) {
    const counted = ms.filter((m) => m.countsForRecords && m.played);
    const summary: SeasonSummary = {
      ...emptySummary(),
      played: counted.length,
      won: counted.filter((m) => m.result === "W").length,
      drawn: counted.filter((m) => m.result === "D").length,
      lost: counted.filter((m) => m.result === "L").length,
      goalsFor: counted.reduce((t, m) => t + (m.ourGoals ?? 0), 0),
      goalsAgainst: counted.reduce((t, m) => t + (m.theirGoals ?? 0), 0),
    };
    const roster = [...new Set(ms.flatMap((m) => m.lineup.map((l) => l.player)))];
    const season: Season = { id, number: ms[0].seasonNumber, title: id === "FR" ? "Friendlies" : `Season ${ms[0].seasonNumber}`, venue: "PlayFootball Old Street", venueUrl: null, period: "", matches: ms, summary, players: roster, isCurrent: false, isComplete: false };
    if (id === "FR") friendlies = season; else seasons.push(season);
  }
  seasons.sort((a, b) => a.number - b.number);
  const allTime = seasons.reduce<SeasonSummary>((acc, s) => ({ ...acc, played: acc.played + s.summary.played, won: acc.won + s.summary.won, drawn: acc.drawn + s.summary.drawn, lost: acc.lost + s.summary.lost, goalsFor: acc.goalsFor + s.summary.goalsFor, goalsAgainst: acc.goalsAgainst + s.summary.goalsAgainst }), emptySummary());
  return { fetchedAt: "2026-06-01T12:00:00.000Z", sheetUrl: "", seasons, friendlies, matches, players, money: { paidBy: {}, rows: [], payments: [] }, allTime, ...extra };
}
