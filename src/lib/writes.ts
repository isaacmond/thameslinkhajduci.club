import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { atomic, getDb, schema, type Db } from "./db";
import { slugify } from "./slug";

/**
 * Every change the site makes to the records, in one place. Callers (server actions, the submit route) check who is
 * allowed to do what; these functions just do it and stamp who did it. Reads for pages go through db-data.ts.
 */
export type ScoreChange = { matchId: string; ours: number; theirs: number; scorers: Record<string, number>; assists: Record<string, number>; played: string[]; motm: string | null; comment: string | null };
export type PaymentChange = { player: string; to: string | null; amount: number; date: string; note: string };
export type PlayerChange = { name: string; nickname: string; positions: string[]; shirt: number | null; photo: string; seasonId: string | null };
export type ProfileChange = { nickname?: string; positions?: string[]; shirt?: number | null; photo?: string | null; bio?: string };
export type FixtureChange = { id?: string; seasonId: string; gw: number; date: string | null; kickOff: string | null; opponent: string; type: string | null; matchCost: number | null; comment?: string | null };
export type SeasonChange = { id: string; number: number; title: string; venue: string; venueUrl: string | null; period: string; pitchCost: number | null; paidBy: string | null };

const money = (n: number | null | undefined) => (n === null || n === undefined ? null : n.toFixed(2));

/** Make sure every named player exists and is on the season's team sheet (appended at the end). */
async function ensureOnRoster(db: Db, seasonId: string, names: string[], by: string) {
  const unique = [...new Set(names)].filter(Boolean);
  if (!unique.length) return;
  const known = new Set((await db.select({ name: schema.players.name }).from(schema.players).where(inArray(schema.players.name, unique))).map((r) => r.name));
  const missing = unique.filter((n) => !known.has(n));
  if (missing.length) await db.insert(schema.players).values(missing.map((name) => ({ name, slug: slugify(name), updatedBy: by }))).onConflictDoNothing();
  const onSheet = new Set((await db.select({ player: schema.seasonRosters.player }).from(schema.seasonRosters).where(eq(schema.seasonRosters.seasonId, seasonId))).map((r) => r.player));
  const toAdd = unique.filter((n) => !onSheet.has(n));
  if (toAdd.length) {
    const [{ top }] = await db.select({ top: max(schema.seasonRosters.position) }).from(schema.seasonRosters).where(eq(schema.seasonRosters.seasonId, seasonId));
    await db.insert(schema.seasonRosters).values(toAdd.map((player, i) => ({ seasonId, player, position: (top ?? -1) + 1 + i }))).onConflictDoNothing();
  }
}

/** A result: score, line-up, scorers, assists, MOTM. Replaces whatever was recorded for that fixture. */
export async function recordScore(c: ScoreChange, by: string, db: Db = getDb()) {
  const [m] = await db.select({ id: schema.matches.id, seasonId: schema.matches.seasonId }).from(schema.matches).where(eq(schema.matches.id, c.matchId));
  if (!m) throw new Error(`No fixture ${c.matchId}`);
  const names = [...new Set([...c.played, ...Object.keys(c.scorers), ...Object.keys(c.assists), ...(c.motm ? [c.motm] : [])])];
  await ensureOnRoster(db, m.seasonId, names, by);
  const lines = names.map((player) => ({ matchId: c.matchId, player, played: c.played.includes(player) || (c.scorers[player] ?? 0) > 0, goals: c.scorers[player] ?? 0, assists: c.assists[player] ?? 0 })).filter((l) => l.played || l.goals || l.assists);
  await atomic(db, [
    db.update(schema.matches).set({ ourGoals: c.ours, theirGoals: c.theirs, motm: c.motm, comment: c.comment, updatedAt: new Date(), updatedBy: by }).where(eq(schema.matches.id, c.matchId)),
    db.delete(schema.appearances).where(eq(schema.appearances.matchId, c.matchId)),
    ...(lines.length ? [db.insert(schema.appearances).values(lines)] : []),
  ]);
}

export async function recordPayment(c: PaymentChange, by: string, db: Db = getDb()) {
  await db.insert(schema.payments).values({ date: c.date, player: c.player, paidTo: c.to, amount: c.amount.toFixed(2), note: c.note || null, createdBy: by });
}

/** A new signing: on the players table and, when a season is given, on its team sheet. */
export async function addPlayer(c: PlayerChange, by: string, db: Db = getDb()) {
  await db.insert(schema.players).values({ name: c.name, slug: slugify(c.name), nickname: c.nickname || null, positions: c.positions, shirt: c.shirt, photo: c.photo || null, updatedBy: by }).onConflictDoNothing();
  if (c.seasonId) await ensureOnRoster(db, c.seasonId, [c.name], by);
}

export async function updateProfile(player: string, c: ProfileChange, by: string, db: Db = getDb()) {
  const set: Partial<typeof schema.players.$inferInsert> = { updatedAt: new Date(), updatedBy: by };
  if (c.nickname !== undefined) set.nickname = c.nickname || null;
  if (c.positions !== undefined) set.positions = c.positions;
  if (c.shirt !== undefined) set.shirt = c.shirt;
  if (c.photo !== undefined) set.photo = c.photo || null;
  if (c.bio !== undefined) set.bio = c.bio || null;
  const updated = await db.update(schema.players).set(set).where(eq(schema.players.name, player)).returning();
  if (!updated.length) await db.insert(schema.players).values({ name: player, slug: slugify(player), ...set });
}

/* ------------------------------------------------------------------ members */
export async function listMembers(db: Db = getDb()) {
  return db.select().from(schema.members).orderBy(asc(schema.members.player), asc(schema.members.email));
}
export async function addMember(email: string, player: string, admin: boolean, by: string, db: Db = getDb()) {
  await db.insert(schema.members).values({ email: email.trim().toLowerCase(), player, admin, addedBy: by }).onConflictDoUpdate({ target: schema.members.email, set: { player, admin, addedBy: by } });
}
export async function removeMember(email: string, db: Db = getDb()) {
  await db.delete(schema.members).where(eq(schema.members.email, email.trim().toLowerCase()));
}

/* -------------------------------------------------------- seasons & fixtures */
export async function upsertSeason(c: SeasonChange, db: Db = getDb()) {
  const row = { number: c.number, title: c.title, venue: c.venue, venueUrl: c.venueUrl, period: c.period, pitchCost: money(c.pitchCost), paidBy: c.paidBy }; // season cost is price per game × fixtures, computed on read
  await db.insert(schema.seasons).values({ id: c.id, ...row }).onConflictDoUpdate({ target: schema.seasons.id, set: row });
}
export async function upsertFixture(c: FixtureChange, by: string, db: Db = getDb()) {
  const id = c.id ?? `${c.seasonId.toLowerCase()}-gw${c.gw}`;
  const [season] = await db.select({ pitchCost: schema.seasons.pitchCost }).from(schema.seasons).where(eq(schema.seasons.id, c.seasonId));
  if (!season) throw new Error(`No season ${c.seasonId}`);
  const cost = c.matchCost ?? (season.pitchCost ? Number(season.pitchCost) : 0);
  const row = { seasonId: c.seasonId, gw: c.gw, date: c.date, kickOff: c.kickOff, opponent: c.opponent || "TBC", type: c.type, matchCost: cost.toFixed(2), updatedAt: new Date(), updatedBy: by, ...(c.comment !== undefined ? { comment: c.comment } : {}) };
  await db.insert(schema.matches).values({ id, ...row }).onConflictDoUpdate({ target: schema.matches.id, set: row });
  return id;
}
export async function deleteFixture(id: string, db: Db = getDb()) {
  await db.delete(schema.matches).where(eq(schema.matches.id, id));
}
/** Every fixture of a season, for the admin's editor. */
export async function fixturesOf(seasonId: string, db: Db = getDb()) {
  return db.select().from(schema.matches).where(eq(schema.matches.seasonId, seasonId)).orderBy(asc(schema.matches.gw));
}

/* ---------------------------------------------------------- the approval queue */
export type Submission = typeof schema.submissions.$inferSelect;
export async function queueSubmission(kind: "score" | "payment" | "player", payload: Record<string, unknown>, summary: string, submittedBy: string, db: Db = getDb()): Promise<number> {
  const [row] = await db.insert(schema.submissions).values({ kind, payload, summary, submittedBy }).returning();
  return row.id;
}
export async function pendingSubmissions(db: Db = getDb()): Promise<Submission[]> {
  return db.select().from(schema.submissions).where(eq(schema.submissions.status, "pending")).orderBy(desc(schema.submissions.createdAt));
}
export async function recentDecisions(limit = 10, db: Db = getDb()): Promise<Submission[]> {
  return db.select().from(schema.submissions).where(sql`${schema.submissions.status} <> 'pending'`).orderBy(desc(schema.submissions.decidedAt)).limit(limit);
}
/** Apply a queued submission by re-running the same write a member would have triggered, then mark it. */
export async function applySubmission(id: number, by: string, db: Db = getDb()): Promise<Submission | null> {
  const [s] = await db.select().from(schema.submissions).where(and(eq(schema.submissions.id, id), eq(schema.submissions.status, "pending")));
  if (!s) return null;
  if (s.kind === "score") await recordScore(s.payload as unknown as ScoreChange, `${by} (approved ${s.submittedBy})`, db);
  else if (s.kind === "payment") await recordPayment(s.payload as unknown as PaymentChange, `${by} (approved ${s.submittedBy})`, db);
  else if (s.kind === "player") await addPlayer(s.payload as unknown as PlayerChange, `${by} (approved ${s.submittedBy})`, db);
  await db.update(schema.submissions).set({ status: "applied", decidedAt: new Date(), decidedBy: by }).where(eq(schema.submissions.id, id));
  return s;
}
export async function rejectSubmission(id: number, by: string, db: Db = getDb()) {
  await db.update(schema.submissions).set({ status: "rejected", decidedAt: new Date(), decidedBy: by }).where(and(eq(schema.submissions.id, id), eq(schema.submissions.status, "pending")));
}

/* ----------------------------------------------------------------- admin flag */
/** Make (or unmake) a player an admin; applies to every address they sign in with. */
export async function setAdmin(player: string, admin: boolean, db: Db = getDb()) {
  await db.update(schema.members).set({ admin }).where(eq(schema.members.player, player));
}

/* ---------------------------------------------------------------- team sheets */
export type Squad = typeof schema.squads.$inferSelect;
export async function getSquad(matchId: string, db: Db = getDb()): Promise<Squad | null> {
  const [s] = await db.select().from(schema.squads).where(eq(schema.squads.matchId, matchId));
  return s ?? null;
}
export async function listSquads(db: Db = getDb()): Promise<Squad[]> {
  return db.select().from(schema.squads);
}
/** Set the expected squad for a fixture. Changing it clears the "reminded" mark so the new list gets its reminder. */
export async function saveSquad(matchId: string, players: string[], note: string | null, by: string, db: Db = getDb()) {
  const unique = [...new Set(players.map((p) => p.trim()).filter(Boolean))];
  const row = { players: unique, note: note || null, updatedAt: new Date(), updatedBy: by, remindedAt: null };
  await db.insert(schema.squads).values({ matchId, ...row }).onConflictDoUpdate({ target: schema.squads.matchId, set: row });
}
export async function markReminded(matchId: string, db: Db = getDb()) {
  await db.update(schema.squads).set({ remindedAt: new Date() }).where(eq(schema.squads.matchId, matchId));
}
/** Squads for fixtures on `date` (yyyy-mm-dd) that have not had their reminder yet. */
export async function squadsNeedingReminder(date: string, db: Db = getDb()): Promise<(Squad & { opponent: string })[]> {
  const rows = await db.select({ squad: schema.squads, opponent: schema.matches.opponent }).from(schema.squads).innerJoin(schema.matches, eq(schema.matches.id, schema.squads.matchId)).where(and(eq(schema.matches.date, date), sql`${schema.squads.remindedAt} is null`));
  return rows.map((r) => ({ ...r.squad, opponent: r.opponent }));
}
