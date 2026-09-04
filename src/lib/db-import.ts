import { schema, type Db } from "./db";
import { STATIC_EXTRAS } from "./assemble";
import { MEMBERS } from "./members";
import { slugify } from "./slug";
import type { ClubData, Season } from "./types";

/**
 * Loads a parsed workbook into a database, replacing everything in the tables. It did the one-off migration from the
 * Google Sheet on 4 Sep 2026 and now exists for the tests only (tests/db.ts seeds an in-process Postgres with it). There
 * is deliberately no npm script for it any more: run against the live database it would wipe everything recorded since.
 */
export type ImportExtras = { aliases: Record<string, string>; opponents: Record<string, string> };

const mostCommon = (xs: number[]) => { const c = new Map<number, number>(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null; };
const money = (n: number | null) => (n === null ? null : n.toFixed(2));

export async function importClubData(db: Db, data: ClubData, extras: ImportExtras): Promise<{ seasons: number; matches: number; players: number; payments: number }> {
  const seasons: Season[] = [...data.seasons, ...(data.friendlies ? [data.friendlies] : [])];
  const names = new Set<string>();
  for (const s of seasons) { for (const p of s.players) names.add(p); for (const m of s.matches) { for (const l of m.lineup) names.add(l.player); if (m.motm) names.add(m.motm); } }
  for (const p of data.players) names.add(p.name);
  for (const r of data.money.rows) names.add(r.player);
  for (const p of data.money.payments) { names.add(p.player); if (p.to) names.add(p.to); }
  const byName = new Map(data.players.map((p) => [p.name, p]));

  for (const t of [schema.submissions, schema.appearances, schema.matches, schema.seasonRosters, schema.payments, schema.players, schema.seasons, schema.aliases, schema.opponentAliases, schema.members, schema.settings]) await db.delete(t);

  await db.insert(schema.players).values([...names].sort().map((name) => {
    const e = byName.get(name)?.extra ?? STATIC_EXTRAS[name] ?? {};
    return { name, slug: slugify(name), nickname: ("nickname" in e ? e.nickname : null) ?? null, positions: e.positions ?? [], shirt: e.shirt ?? null, photo: e.photo ?? null, bio: ("bio" in e ? e.bio : null) ?? null, updatedBy: "import" };
  }));
  for (const s of seasons) {
    await db.insert(schema.seasons).values({ id: s.id, number: s.number, title: s.title, venue: s.venue, period: s.period, pitchCost: money(mostCommon(s.matches.map((m) => m.matchCost).filter((c) => c > 0))), paidBy: data.money.paidBy[s.id] ?? s.summary.paidBy ?? null, seasonCost: s.summary.seasonCost.toFixed(2) });
    if (s.players.length) await db.insert(schema.seasonRosters).values(s.players.map((p, i) => ({ seasonId: s.id, player: p, position: i })));
    if (s.matches.length) await db.insert(schema.matches).values(s.matches.map((m) => {
      const played = m.lineup.filter((l) => l.played).length;
      return { id: m.id, seasonId: s.id, gw: m.gw, date: m.date, kickOff: m.kickOff, opponent: m.opponent, ourGoals: m.ourGoals, theirGoals: m.theirGoals, motm: m.motm, comment: m.comment, type: s.id === "FR" && m.type === "Friendly" ? null : m.type, matchCost: m.matchCost.toFixed(2), playersInGame: m.playersInGame !== played ? m.playersInGame : null, updatedBy: "import" };
    }));
    const lines = s.matches.flatMap((m) => m.lineup.map((l) => ({ matchId: m.id, player: l.player, played: l.played, goals: l.goals, assists: l.assists })));
    if (lines.length) await db.insert(schema.appearances).values(lines);
  }
  if (data.money.payments.length) await db.insert(schema.payments).values(data.money.payments.map((p) => ({ date: p.date, player: p.player, paidTo: p.to, amount: p.amount.toFixed(2), note: p.note, createdBy: "import" })));
  const aliasRows = Object.entries(extras.aliases).map(([fromName, toName]) => ({ fromName, toName }));
  if (aliasRows.length) await db.insert(schema.aliases).values(aliasRows);
  const oppRows = Object.entries(extras.opponents).map(([key, toName]) => ({ key, toName }));
  if (oppRows.length) await db.insert(schema.opponentAliases).values(oppRows);
  const memberRows = MEMBERS.flatMap((m) => m.emails.map((e) => ({ email: e.toLowerCase(), player: m.player, admin: Boolean(m.admin), addedBy: "import" })));
  if (memberRows.length) await db.insert(schema.members).values(memberRows).onConflictDoNothing();
  const tracked = seasons.filter((s) => s.id !== "FR" && s.matches.some((m) => m.matchCost > 0)).map((s) => s.number);
  await db.insert(schema.settings).values({ key: "money_from_season", value: String(tracked.length ? Math.min(...tracked) : 8) });
  return { seasons: seasons.length, matches: seasons.reduce((t, s) => t + s.matches.length, 0), players: names.size, payments: data.money.payments.length };
}
