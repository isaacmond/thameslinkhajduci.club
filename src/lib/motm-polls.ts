import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { Resend } from "resend";
import { atomic, getDb, schema, type Db } from "./db";
import { groupMembers } from "./members";
import { REMINDER_FROM } from "./reminder-email";
import { log } from "./log";
import { decide, fmtCloses, MOTM_POLL_HOURS, pollEligible, renderBallot, renderResult, type Candidate, type Count, type MotmMatch } from "./motm";

/**
 * The man-of-the-match vote, the database half. A poll opens when a league result is recorded (openMotmPoll), everyone who
 * played and has an address gets a ballot link (sendBallots), votes come in through castVote, and the poll closes when the
 * last ballot lands, when the 48 hours are up (closeDuePolls, from the daily cron and whenever a ballot is opened late), or
 * when the admin says so. Closing writes the winner to matches.motm. Callers purge the page cache; nothing here imports next.
 */
export type MotmPoll = typeof schema.motmPolls.$inferSelect;
export type MotmBallot = typeof schema.motmBallots.$inferSelect;
type Fixture = { match: MotmMatch & { type: string | null }; candidates: Candidate[] };

const newToken = () => randomBytes(24).toString("base64url");
const lower = (s: string) => s.trim().toLowerCase();

async function fixture(db: Db, matchId: string): Promise<Fixture | null> {
  const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!m) return null;
  const lines = await db.select().from(schema.appearances).where(eq(schema.appearances.matchId, matchId));
  const candidates = lines.filter((l) => l.played).map((l) => ({ player: l.player, goals: l.goals, assists: l.assists })).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
  return { match: { id: m.id, seasonId: m.seasonId, gw: m.gw, opponent: m.opponent, date: m.date, ourGoals: m.ourGoals, theirGoals: m.theirGoals, type: m.type }, candidates };
}
/** player name (lower-cased) → every address they sign in with */
async function emailsByPlayer(db: Db): Promise<Map<string, string[]>> {
  const members = groupMembers(await db.select().from(schema.members));
  return new Map(members.map((m) => [lower(m.player), m.emails]));
}
const ballotsOf = (db: Db, matchId: string) => db.select().from(schema.motmBallots).where(eq(schema.motmBallots.matchId, matchId)).orderBy(asc(schema.motmBallots.player));

/* ------------------------------------------------------------------ opening */
export type ToSend = { ballot: MotmBallot; emails: string[] };
export type OpenResult = {
  outcome: "opened" | "updated" | "unchanged" | "cancelled" | "skipped";
  message: string;
  /** ballots that still need their email */
  toSend: ToSend[];
  /** played, but no address on the members list, so no vote */
  noEmail: string[];
  fixture?: Fixture;
  closesAt?: Date;
  closed?: CloseResult | null;
};

/**
 * Open the vote for a fixture whose result was just recorded, or bring an open one into line with a corrected line-up (new
 * players get ballots, dropped players lose theirs, votes for someone no longer in the line-up are cleared). A result that is
 * no longer a league game cancels an open poll; a decided poll is left alone.
 */
export async function openMotmPoll(matchId: string, by: string, db: Db = getDb(), now: Date = new Date()): Promise<OpenResult> {
  const none = (outcome: OpenResult["outcome"], message: string, extra: Partial<OpenResult> = {}): OpenResult => ({ outcome, message, toSend: [], noEmail: [], ...extra });
  const fx = await fixture(db, matchId);
  if (!fx) return none("skipped", `No fixture ${matchId}.`);
  const [existing] = await db.select().from(schema.motmPolls).where(eq(schema.motmPolls.matchId, matchId));
  const eligible = pollEligible(fx.match, fx.candidates.map((c) => c.player));
  if (!eligible.ok) {
    if (existing?.status === "open") {
      await db.update(schema.motmPolls).set({ status: "cancelled", closedAt: now, closedBy: eligible.reason }).where(eq(schema.motmPolls.matchId, matchId));
      return none("cancelled", `Man-of-the-match vote cancelled: ${eligible.reason}.`, { fixture: fx });
    }
    return none("skipped", `No man-of-the-match vote: ${eligible.reason}.`, { fixture: fx });
  }
  if (existing?.status === "closed") return none("unchanged", `The man-of-the-match vote for this game has already been decided${existing.winner ? ` (${existing.winner})` : ""}.`, { fixture: fx });

  const emails = await emailsByPlayer(db);
  const voters = fx.candidates.filter((c) => emails.get(lower(c.player))?.length);
  const noEmail = fx.candidates.filter((c) => !emails.get(lower(c.player))?.length).map((c) => c.player);
  const candidates = fx.candidates.map((c) => c.player);

  if (!existing || existing.status === "cancelled") {
    if (!voters.length) return none("skipped", "No man-of-the-match vote: nobody who played has an email on the members list.", { fixture: fx, noEmail });
    const closesAt = new Date(now.getTime() + MOTM_POLL_HOURS * 3_600_000);
    const row = { status: "open", candidates, openedAt: now, closesAt, closedAt: null, closedBy: null, winner: null, openedBy: by };
    const ballots = voters.map((c) => ({ token: newToken(), matchId, player: c.player }));
    await atomic(db, [
      db.insert(schema.motmPolls).values({ matchId, ...row }).onConflictDoUpdate({ target: schema.motmPolls.matchId, set: row }),
      db.delete(schema.motmBallots).where(eq(schema.motmBallots.matchId, matchId)),
      db.insert(schema.motmBallots).values(ballots),
    ]);
    const saved = await ballotsOf(db, matchId);
    return { outcome: "opened", message: `Man-of-the-match vote open until ${fmtCloses(closesAt)}: ${saved.length} ballot${saved.length === 1 ? "" : "s"}.`, toSend: saved.map((b) => ({ ballot: b, emails: emails.get(lower(b.player)) ?? [] })), noEmail, fixture: fx, closesAt };
  }

  // Open already: a correction changed the line-up, so the ballots follow it.
  const current = await ballotsOf(db, matchId);
  const have = new Set(current.map((b) => b.player));
  const dropped = current.filter((b) => !candidates.includes(b.player)).map((b) => b.token);
  const added = voters.filter((c) => !have.has(c.player)).map((c) => ({ token: newToken(), matchId, player: c.player }));
  const stale = current.filter((b) => b.vote && !candidates.includes(b.vote)).map((b) => b.token);
  const queries = [
    ...(dropped.length ? [db.delete(schema.motmBallots).where(inArray(schema.motmBallots.token, dropped))] : []),
    ...(added.length ? [db.insert(schema.motmBallots).values(added)] : []),
    ...(stale.length ? [db.update(schema.motmBallots).set({ vote: null, votedAt: null }).where(inArray(schema.motmBallots.token, stale))] : []),
    db.update(schema.motmPolls).set({ candidates }).where(eq(schema.motmPolls.matchId, matchId)),
  ];
  await atomic(db, queries);
  const after = await ballotsOf(db, matchId);
  const toSend = after.filter((b) => added.some((a) => a.token === b.token)).map((b) => ({ ballot: b, emails: emails.get(lower(b.player)) ?? [] }));
  const changed = dropped.length + added.length + stale.length > 0;
  // Everyone left has voted (a non-voter was dropped from the line-up): nothing to wait for.
  const closed = after.length && after.every((b) => b.vote) ? await closeMotmPoll(matchId, "everyone voted", db, now) : null;
  const bits = [added.length ? `${added.length} new ballot${added.length === 1 ? "" : "s"}` : "", dropped.length ? `${dropped.length} withdrawn` : "", stale.length ? `${stale.length} vote${stale.length === 1 ? "" : "s"} cleared` : ""].filter(Boolean);
  return { outcome: changed ? "updated" : "unchanged", message: changed ? `Man-of-the-match vote updated for the new line-up: ${bits.join(", ")}.${closed ? ` Closed: ${closed.winner ?? "no votes"}.` : ""}` : `Man-of-the-match vote already open until ${fmtCloses(existing.closesAt)}.`, toSend, noEmail, fixture: fx, closesAt: existing.closesAt, closed };
}

/* ------------------------------------------------------------------ sending */
export type SendResult = { sent: string[]; failed: string[]; skipped?: string };
/** Email the ballots that have not gone out yet: one batch call to Resend, then each is stamped sent. */
export async function sendBallots(r: OpenResult, db: Db = getDb()): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!r.toSend.length || !r.fixture || !r.closesAt) return { sent: [], failed: [] };
  if (!key) return { sent: [], failed: r.toSend.map((t) => t.ballot.player), skipped: "RESEND_API_KEY is not set" };
  const { match, candidates } = r.fixture;
  const closesAt = r.closesAt;
  const mails = r.toSend.filter((t) => t.emails.length).map((t) => ({ from: REMINDER_FROM, to: t.emails, ...renderBallot({ match, voter: t.ballot.player, candidates, token: t.ballot.token, closesAt }) }));
  const players = r.toSend.filter((t) => t.emails.length).map((t) => t.ballot.player);
  try {
    const { error } = await new Resend(key).batch.send(mails);
    if (error) { console.error("motm ballots:", error); return { sent: [], failed: players }; }
  } catch (err) { console.error("motm ballots:", err); return { sent: [], failed: players }; }
  await db.update(schema.motmBallots).set({ sentAt: new Date() }).where(inArray(schema.motmBallots.token, r.toSend.map((t) => t.ballot.token)));
  return { sent: players, failed: [] };
}

/** The whole thing after a result lands: open (or sync) the poll, email the ballots, say what happened in one line. */
export async function afterScoreRecorded(matchId: string, by: string, db: Db = getDb()): Promise<{ result: OpenResult; sent: SendResult; message: string }> {
  const result = await openMotmPoll(matchId, by, db);
  const sent = await sendBallots(result, db);
  log("motm.poll", { matchId, outcome: result.outcome, ballots: result.toSend.length, sent: sent.sent.length, failed: sent.failed.length, noEmail: result.noEmail.length, skipped: sent.skipped ?? null });
  const parts = [result.message];
  if (sent.sent.length) parts.push(`Ballots emailed to ${sent.sent.join(", ")}.`);
  if (sent.skipped) parts.push(`Ballots not emailed: ${sent.skipped}.`);
  else if (sent.failed.length) parts.push(`Emails failed for ${sent.failed.join(", ")}.`);
  if (result.noEmail.length && result.outcome !== "skipped" && result.outcome !== "cancelled") parts.push(`No vote for ${result.noEmail.join(", ")}: no email on the members list.`);
  return { result, sent, message: parts.join(" ") };
}

/* ------------------------------------------------------------------- voting */
export type VoteResult = { ok: true; matchId: string; player: string; vote: string; closed: CloseResult | null } | { ok: false; error: string; closed?: boolean };
/** One ballot, one pick. Changing your mind is allowed until the poll closes; the last ballot in closes it. */
export async function castVote(token: string, candidate: string, db: Db = getDb(), now: Date = new Date()): Promise<VoteResult> {
  const [row] = await db.select({ ballot: schema.motmBallots, poll: schema.motmPolls }).from(schema.motmBallots).innerJoin(schema.motmPolls, eq(schema.motmPolls.matchId, schema.motmBallots.matchId)).where(eq(schema.motmBallots.token, token));
  if (!row) return { ok: false, error: "That ballot does not exist. Check the link in your email." };
  const { ballot, poll } = row;
  if (poll.status !== "open") return { ok: false, error: "Voting has closed for this game.", closed: true };
  if (now.getTime() >= poll.closesAt.getTime()) { await closeMotmPoll(poll.matchId, "deadline", db, now); return { ok: false, error: `Voting closed ${fmtCloses(poll.closesAt)}.`, closed: true }; }
  if (candidate === ballot.player) return { ok: false, error: "You cannot vote for yourself. Nice try." };
  if (!poll.candidates.includes(candidate)) return { ok: false, error: `${candidate} was not on the pitch for this one.` };
  await db.update(schema.motmBallots).set({ vote: candidate, votedAt: now }).where(eq(schema.motmBallots.token, token));
  const all = await ballotsOf(db, poll.matchId);
  const closed = all.every((b) => b.vote) ? await closeMotmPoll(poll.matchId, "everyone voted", db, now) : null;
  log("motm.vote", { matchId: poll.matchId, voted: all.filter((b) => b.vote).length, of: all.length, closed: Boolean(closed) });
  return { ok: true, matchId: poll.matchId, player: ballot.player, vote: candidate, closed };
}

/* ------------------------------------------------------------------ closing */
export type CloseResult = { matchId: string; match: MotmMatch; winner: string | null; counts: Count[]; ballots: number; voted: number; reason: string; tieBreak: string | null };
/**
 * Count the votes, name the winner, write it to the fixture, tell everyone who had a ballot. `reason` is 'everyone voted',
 * 'deadline' or the admin's name. Returns null when the poll is not open (already closed, cancelled, or never existed).
 */
export async function closeMotmPoll(matchId: string, reason: string, db: Db = getDb(), now: Date = new Date()): Promise<CloseResult | null> {
  const [poll] = await db.select().from(schema.motmPolls).where(and(eq(schema.motmPolls.matchId, matchId), eq(schema.motmPolls.status, "open")));
  const fx = poll ? await fixture(db, matchId) : null;
  if (!poll || !fx) return null;
  const ballots = await ballotsOf(db, matchId);
  const d = decide(ballots, fx.candidates);
  await atomic(db, [
    db.update(schema.motmPolls).set({ status: "closed", closedAt: now, closedBy: reason, winner: d.winner }).where(eq(schema.motmPolls.matchId, matchId)),
    ...(d.winner ? [db.update(schema.matches).set({ motm: d.winner, updatedAt: now, updatedBy: `MOTM vote (${reason})` }).where(eq(schema.matches.id, matchId))] : []),
  ]);
  const result: CloseResult = { matchId, match: fx.match, winner: d.winner, counts: d.counts, ballots: ballots.length, voted: d.voted, reason, tieBreak: d.tieBreak };
  log("motm.closed", { matchId, winner: d.winner, voted: d.voted, of: ballots.length, reason, tieBreak: d.tieBreak });
  if (d.winner) await announceResult(result, ballots, db);
  return result;
}
async function announceResult(r: CloseResult, ballots: MotmBallot[], db: Db) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !r.winner) return;
  const emails = await emailsByPlayer(db);
  const mail = renderResult({ match: r.match, winner: r.winner, counts: r.counts, ballots: r.ballots, reason: r.reason });
  const mails = ballots.map((b) => emails.get(lower(b.player)) ?? []).filter((to) => to.length).map((to) => ({ from: REMINDER_FROM, to, ...mail }));
  if (!mails.length) return;
  try { const { error } = await new Resend(key).batch.send(mails); if (error) console.error("motm result:", error); }
  catch (err) { console.error("motm result:", err); }
}
/** Every open poll past its deadline, closed. The daily cron calls this; so does a ballot opened after time. */
export async function closeDuePolls(db: Db = getDb(), now: Date = new Date()): Promise<CloseResult[]> {
  const due = await db.select({ matchId: schema.motmPolls.matchId }).from(schema.motmPolls).where(and(eq(schema.motmPolls.status, "open"), lte(schema.motmPolls.closesAt, now)));
  const out: CloseResult[] = [];
  for (const p of due) { const r = await closeMotmPoll(p.matchId, "deadline", db, now); if (r) out.push(r); }
  return out;
}

/* ------------------------------------------------------------------- reading */
export type BallotView = { ballot: MotmBallot; poll: MotmPoll; match: MotmMatch; candidates: Candidate[]; ballots: { player: string; voted: boolean }[]; counts: Count[] | null };
/** Everything the ballot page shows. A ballot opened after the deadline closes its poll on the way in. */
export async function ballotView(token: string, db: Db = getDb(), now: Date = new Date()): Promise<BallotView | null> {
  const [ballot] = await db.select().from(schema.motmBallots).where(eq(schema.motmBallots.token, token));
  if (!ballot) return null;
  let [poll] = await db.select().from(schema.motmPolls).where(eq(schema.motmPolls.matchId, ballot.matchId));
  if (!poll) return null;
  if (poll.status === "open" && now.getTime() >= poll.closesAt.getTime()) { await closeMotmPoll(poll.matchId, "deadline", db, now); [poll] = await db.select().from(schema.motmPolls).where(eq(schema.motmPolls.matchId, ballot.matchId)); }
  const fx = await fixture(db, ballot.matchId);
  if (!fx) return null;
  const all = await ballotsOf(db, ballot.matchId);
  const counts = poll.status === "closed" ? decide(all, fx.candidates).counts : null;
  return { ballot, poll, match: fx.match, candidates: fx.candidates, ballots: all.map((b) => ({ player: b.player, voted: Boolean(b.vote) })), counts };
}

export type PollSummary = { status: string; closesAt: Date; closedAt: Date | null; closedBy: string | null; winner: string | null; ballots: number; voted: number; counts: Count[] | null; noVote: string[] };
/** For the fixture page: how the vote stands, or how it ended. */
export async function pollSummary(matchId: string, db: Db = getDb()): Promise<PollSummary | null> {
  const [poll] = await db.select().from(schema.motmPolls).where(eq(schema.motmPolls.matchId, matchId));
  if (!poll || poll.status === "cancelled") return null;
  const [all, fx] = await Promise.all([ballotsOf(db, matchId), fixture(db, matchId)]);
  const voters = new Set(all.map((b) => b.player));
  return { status: poll.status, closesAt: poll.closesAt, closedAt: poll.closedAt, closedBy: poll.closedBy, winner: poll.winner, ballots: all.length, voted: all.filter((b) => b.vote).length, counts: poll.status === "closed" && fx ? decide(all, fx.candidates).counts : null, noVote: poll.candidates.filter((c) => !voters.has(c)) };
}

export type PollRow = MotmPoll & { opponent: string; gw: number; seasonId: string; date: string | null; ourGoals: number | null; theirGoals: number | null; ballots: number; voted: number };
/** For the admin: open polls first, then the most recently decided. */
export async function listMotmPolls(limit = 10, db: Db = getDb()): Promise<PollRow[]> {
  const rows = await db.select({ poll: schema.motmPolls, opponent: schema.matches.opponent, gw: schema.matches.gw, seasonId: schema.matches.seasonId, date: schema.matches.date, ourGoals: schema.matches.ourGoals, theirGoals: schema.matches.theirGoals })
    .from(schema.motmPolls).innerJoin(schema.matches, eq(schema.matches.id, schema.motmPolls.matchId))
    .orderBy(sql`case when ${schema.motmPolls.status} = 'open' then 0 else 1 end`, desc(schema.motmPolls.openedAt)).limit(limit);
  if (!rows.length) return [];
  const counts = await db.select({ matchId: schema.motmBallots.matchId, ballots: sql<number>`count(*)::int`, voted: sql<number>`count(${schema.motmBallots.vote})::int` }).from(schema.motmBallots).where(inArray(schema.motmBallots.matchId, rows.map((r) => r.poll.matchId))).groupBy(schema.motmBallots.matchId);
  const byMatch = new Map(counts.map((c) => [c.matchId, c]));
  return rows.map((r) => ({ ...r.poll, opponent: r.opponent, gw: r.gw, seasonId: r.seasonId, date: r.date, ourGoals: r.ourGoals, theirGoals: r.theirGoals, ballots: byMatch.get(r.poll.matchId)?.ballots ?? 0, voted: byMatch.get(r.poll.matchId)?.voted ?? 0 }));
}
