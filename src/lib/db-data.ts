import { asc } from "drizzle-orm";
import { getDb, schema, type Db } from "./db";
import { assembleClubData, mergeExtras, recomputeSummary, rejectedPhotos, resultOf, safePhoto, seasonComplete } from "./assemble";
import { SHEET_URL } from "./config";
import type { ClubData, Match, MoneyRow, Payment, PlayerMatchLine, Season, SeasonSummary, SquadExtra } from "./types";

/**
 * Reads the records from Postgres and hands them to the same assembly the sheet parser used, so every page sees the
 * same ClubData shape. One round of queries, all in parallel; the caller (lib/data.ts) caches the result for a minute.
 */
const num = (v: string | number | null | undefined) => (v === null || v === undefined ? 0 : Number(v));

export async function loadClubData(db: Db = getDb()): Promise<ClubData> {
  const [seasonRows, rosterRows, matchRows, appRows, playerRows, paymentRows, settingRows] = await Promise.all([
    db.select().from(schema.seasons).orderBy(asc(schema.seasons.number), asc(schema.seasons.id)),
    db.select().from(schema.seasonRosters).orderBy(asc(schema.seasonRosters.seasonId), asc(schema.seasonRosters.position), asc(schema.seasonRosters.player)),
    db.select().from(schema.matches).orderBy(asc(schema.matches.seasonId), asc(schema.matches.gw)),
    db.select().from(schema.appearances),
    db.select().from(schema.players).orderBy(asc(schema.players.name)),
    db.select().from(schema.payments).orderBy(asc(schema.payments.date), asc(schema.payments.id)),
    db.select().from(schema.settings),
  ]);
  const settings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));
  const moneyFrom = Number(settings.money_from_season ?? "8");

  const rostersBySeason = new Map<string, string[]>();
  for (const r of rosterRows) rostersBySeason.set(r.seasonId, [...(rostersBySeason.get(r.seasonId) ?? []), r.player]);
  const appsByMatch = new Map<string, typeof appRows>();
  for (const a of appRows) appsByMatch.set(a.matchId, [...(appsByMatch.get(a.matchId) ?? []), a]);
  const matchesBySeason = new Map<string, typeof matchRows>();
  for (const m of matchRows) matchesBySeason.set(m.seasonId, [...(matchesBySeason.get(m.seasonId) ?? []), m]);

  rejectedPhotos.clear();
  const seasons: Season[] = [];
  let friendlies: Season | null = null;
  for (const s of seasonRows) {
    const roster = rostersBySeason.get(s.id) ?? [];
    const order = new Map(roster.map((p, i) => [p, i]));
    const isFriendlies = s.id === "FR";
    const matches: Match[] = (matchesBySeason.get(s.id) ?? []).map((m) => {
      const apps = (appsByMatch.get(m.id) ?? []).filter((a) => a.played || a.goals > 0 || a.assists > 0).sort((a, b) => (order.get(a.player) ?? 1e9) - (order.get(b.player) ?? 1e9) || a.player.localeCompare(b.player));
      const playersInGame = m.playersInGame ?? apps.filter((a) => a.played || a.goals > 0).length;
      const matchCost = num(m.matchCost);
      const costPerPlayer = playersInGame > 0 ? matchCost / playersInGame : 0;
      const lineup: PlayerMatchLine[] = apps.map((a) => ({ player: a.player, played: a.played || a.goals > 0, goals: a.goals, assists: a.assists, cost: a.played ? costPerPlayer : 0 }));
      const og = m.ourGoals, tg = m.theirGoals;
      const played = og !== null && tg !== null;
      const goalsLogged = lineup.reduce((t, l) => t + l.goals, 0), assistsLogged = lineup.reduce((t, l) => t + l.assists, 0);
      return {
        id: m.id, seasonId: s.id, seasonNumber: s.number, gw: m.gw, date: m.date, kickOff: m.kickOff, opponent: m.opponent,
        ourGoals: og, theirGoals: tg, result: resultOf(og, tg), played, motm: m.motm, comment: m.comment,
        type: m.type ?? (isFriendlies ? "Friendly" : null), countsForRecords: !m.type && !isFriendlies,
        scorersRecorded: og === 0 || goalsLogged > 0, assistsRecorded: og === 0 || assistsLogged > 0,
        matchCost, playersInGame, costPerPlayer, lineup,
      };
    });
    const perPlayer = new Map<string, { apps: number; goals: number }>();
    for (const m of matches) if (m.countsForRecords) for (const l of m.lineup) { const x = perPlayer.get(l.player) ?? { apps: 0, goals: 0 }; if (l.played) x.apps++; x.goals += l.goals; perPlayer.set(l.player, x); }
    const top = (key: "apps" | "goals") => { const best = [...perPlayer.entries()].sort((a, b) => b[1][key] - a[1][key] || a[0].localeCompare(b[0]))[0]; return best && best[1][key] > 0 ? best[0] : null; };
    const base: SeasonSummary = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, topScorer: top("goals"), mostApps: top("apps"), seasonCost: num(s.seasonCost), paidBy: s.paidBy };
    const season: Season = { id: s.id, number: s.number, title: s.title, venue: s.venue, period: s.period, matches, summary: recomputeSummary(matches, base), players: roster, isCurrent: false, isComplete: seasonComplete(matches) };
    if (isFriendlies) { if (matches.length) { season.venue = season.venue || "Various venues"; season.period = season.period || "Whenever we fancy"; friendlies = season; } }
    else if (matches.length) seasons.push(season);
  }

  const extras = new Map<string, SquadExtra>();
  for (const p of playerRows) extras.set(p.name, { nickname: p.nickname ?? undefined, positions: p.positions ?? [], shirt: p.shirt, photo: safePhoto(p.name, p.photo), bio: p.bio ?? undefined });

  // Money: charges are each player's share of the pitch in tracked seasons; paid is their transfers; the assembly credits the pitch payer.
  const tracked = [...seasons.filter((s) => s.number >= moneyFrom), ...(friendlies ? [friendlies] : [])];
  const paidBy: Record<string, string> = {};
  for (const s of tracked) if (s.summary.paidBy) paidBy[s.id] = s.summary.paidBy;
  const rows = new Map<string, MoneyRow>();
  const row = (player: string) => { let r = rows.get(player); if (!r) { r = { player, charges: {}, totalCharged: 0, paid: 0, balance: 0, pitchCovered: 0 }; rows.set(player, r); } return r; };
  for (const s of tracked) if (s.id !== "FR") for (const p of s.players) row(p).charges[s.id] = row(p).charges[s.id] ?? 0;
  for (const s of tracked) for (const m of s.matches) if (m.played) for (const l of m.lineup) if (l.cost > 0) { const r = row(l.player); r.charges[s.id] = (r.charges[s.id] ?? 0) + l.cost; }
  const payments: Payment[] = paymentRows.map((p) => ({ date: p.date, player: p.player, amount: num(p.amount), to: p.paidTo, note: p.note }));
  for (const p of payments) row(p.player).paid += p.amount;
  for (const r of rows.values()) { r.totalCharged = Object.values(r.charges).reduce((t, v) => t + v, 0); r.balance = r.totalCharged - r.paid; }

  return assembleClubData({ seasons, friendlies, extras: mergeExtras(extras, (s) => s, safePhoto), money: { paidBy, rows: [...rows.values()].sort((a, b) => a.player.localeCompare(b.player)) }, payments, sheetUrl: SHEET_URL });
}
