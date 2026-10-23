import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { atomic, getDb, schema, type Db } from "./db";
import { slugify } from "./slug";

/**
 * Every change the site makes to the records, in one place. Callers (server actions, the submit route) check who is
 * allowed to do what; these functions just do it and stamp who did it. Reads for pages go through db-data.ts.
 */
/**
 * `forfeit`: we did not play (turned up late, too few of us). The score is whatever the league awarded, `played` is who pays for the pitch, and the fixture is typed Forfeit so nothing counts.
 * `ringers`: how many outside players were borrowed for the night, with `ringerGoals`/`ringerAssists` what they scored and set up. A count, never names: they are heads for the pitch split, pay nothing, and their share is levied on the regulars.
 */
export type ScoreChange = { matchId: string; ours: number; theirs: number; scorers: Record<string, number>; assists: Record<string, number>; played: string[]; motm: string | null; comment: string | null; forfeit?: boolean; ringers?: number; ringerGoals?: number; ringerAssists?: number };
export type PaymentChange = { player: string; to: string | null; amount: number; date: string; note: string };
export type PlayerChange = { name: string; nickname: string; positions: string[]; shirt: number | null; photo: string; seasonId: string | null };
export type ProfileChange = { nickname?: string; positions?: string[]; shirt?: number | null; photo?: string | null; bio?: string };
export type FixtureChange = { id?: string; seasonId: string; gw: number; date: string | null; kickOff: string | null; opponent: string; type: string | null; matchCost: number | null; comment?: string | null };
export type SeasonChange = { id: string; number: number; title: string; venue: string; venueUrl: string | null; period: string; pitchCost: number | null; paidBy: string | null };

const money = (n: number | null | undefined) => (n === null || n === undefined ? null : n.toFixed(2));

/** Make sure every named player has a row on the players table. */
async function ensurePlayers(db: Db, names: string[], by: string) {
  const unique = [...new Set(names)].filter(Boolean);
  if (!unique.length) return;
  const known = new Set((await db.select({ name: schema.players.name }).from(schema.players).where(inArray(schema.players.name, unique))).map((r) => r.name));
  const missing = unique.filter((n) => !known.has(n));
  if (missing.length) await db.insert(schema.players).values(missing.map((name) => ({ name, slug: slugify(name), updatedBy: by }))).onConflictDoNothing();
}
/** Make sure every named player exists and is on the season's team sheet (appended at the end). */
async function ensureOnRoster(db: Db, seasonId: string, names: string[], by: string) {
  const unique = [...new Set(names)].filter(Boolean);
  if (!unique.length) return;
  await ensurePlayers(db, unique, by);
  const onSheet = new Set((await db.select({ player: schema.seasonRosters.player }).from(schema.seasonRosters).where(eq(schema.seasonRosters.seasonId, seasonId))).map((r) => r.player));
  const toAdd = unique.filter((n) => !onSheet.has(n));
  if (toAdd.length) {
    const [{ top }] = await db.select({ top: max(schema.seasonRosters.position) }).from(schema.seasonRosters).where(eq(schema.seasonRosters.seasonId, seasonId));
    await db.insert(schema.seasonRosters).values(toAdd.map((player, i) => ({ seasonId, player, position: (top ?? -1) + 1 + i }))).onConflictDoNothing();
  }
}

/**
 * A result: score, line-up, scorers, assists, MOTM. Replaces whatever was recorded for that fixture.
 * A forfeit has no scorers or MOTM; its "line-up" is the players charged for the pitch, and the fixture is typed Forfeit.
 * A real score sent for a fixture typed Forfeit lifts the forfeit (the game was played after all); other types are left alone.
 */
export async function recordScore(c: ScoreChange, by: string, db: Db = getDb()) {
  const [m] = await db.select({ id: schema.matches.id, seasonId: schema.matches.seasonId, type: schema.matches.type }).from(schema.matches).where(eq(schema.matches.id, c.matchId));
  if (!m) throw new Error(`No fixture ${c.matchId}`);
  const forfeit = c.forfeit === true;
  const scorers = forfeit ? {} : c.scorers, assists = forfeit ? {} : c.assists, motm = forfeit ? null : c.motm;
  // A forfeit has no ringers: nobody played.
  const ringers = forfeit ? 0 : c.ringers ?? 0;
  const ringerGoals = ringers ? c.ringerGoals ?? 0 : 0, ringerAssists = ringers ? c.ringerAssists ?? 0 : 0;
  const names = [...new Set([...c.played, ...Object.keys(scorers), ...Object.keys(assists), ...(motm ? [motm] : [])])];
  await ensureOnRoster(db, m.seasonId, names, by);
  const lines = names.map((player) => ({ matchId: c.matchId, player, played: c.played.includes(player) || (scorers[player] ?? 0) > 0, goals: scorers[player] ?? 0, assists: assists[player] ?? 0 })).filter((l) => l.played || l.goals || l.assists);
  const type = forfeit ? "Forfeit" : /^forfeit$/i.test(m.type ?? "") ? null : m.type;
  await atomic(db, [
    db.update(schema.matches).set({ ourGoals: c.ours, theirGoals: c.theirs, motm, comment: c.comment, type, ringers, ringerGoals, ringerAssists, updatedAt: new Date(), updatedBy: by }).where(eq(schema.matches.id, c.matchId)),
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

/**
 * Rename a player everywhere they appear. The players row's primary key cascades to appearances, season rosters and
 * ballots; everything that stores the name as plain text (payments, members, man of the match, pitch payer, team sheets,
 * votes, aliases) is rewritten in the same transaction. The old spelling is kept as an alias of the new one.
 */
export async function renamePlayer(from: string, to: string, by: string, db: Db = getDb()): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = to.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Give the player a name." };
  if (name === from) return { ok: true };
  const [old] = await db.select().from(schema.players).where(eq(schema.players.name, from));
  if (!old) return { ok: false, error: `No player called ${from}.` };
  const slug = slugify(name);
  const clash = await db.select({ name: schema.players.name }).from(schema.players).where(sql`${schema.players.name} = ${name} or (${schema.players.slug} = ${slug} and ${schema.players.name} <> ${from})`);
  if (clash.length) return { ok: false, error: `${clash[0].name} already exists. Pick a different name.` };
  const now = new Date();
  await atomic(db, [
    db.update(schema.players).set({ name, slug, updatedAt: now, updatedBy: by }).where(eq(schema.players.name, from)),
    db.update(schema.payments).set({ player: name }).where(eq(schema.payments.player, from)),
    db.update(schema.payments).set({ paidTo: name }).where(eq(schema.payments.paidTo, from)),
    db.update(schema.members).set({ player: name }).where(eq(schema.members.player, from)),
    db.update(schema.matches).set({ motm: name }).where(eq(schema.matches.motm, from)),
    db.update(schema.seasons).set({ paidBy: name }).where(eq(schema.seasons.paidBy, from)),
    db.update(schema.squads).set({ players: sql`array_replace(${schema.squads.players}, ${from}, ${name})` }).where(sql`${from} = any(${schema.squads.players})`),
    db.update(schema.motmPolls).set({ candidates: sql`array_replace(${schema.motmPolls.candidates}, ${from}, ${name})` }).where(sql`${from} = any(${schema.motmPolls.candidates})`),
    db.update(schema.motmPolls).set({ winner: name }).where(eq(schema.motmPolls.winner, from)),
    db.update(schema.motmBallots).set({ vote: name }).where(eq(schema.motmBallots.vote, from)),
    db.update(schema.aliases).set({ toName: name }).where(eq(schema.aliases.toName, from)),
    db.delete(schema.aliases).where(eq(schema.aliases.fromName, name)),
    db.insert(schema.aliases).values({ fromName: from, toName: name }).onConflictDoUpdate({ target: schema.aliases.fromName, set: { toName: name } }),
  ]);
  return { ok: true };
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
