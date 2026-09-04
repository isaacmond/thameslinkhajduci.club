import type { Match } from "./types";
import type { PaymentChange, PlayerChange, ScoreChange } from "./writes";

/**
 * Validation and message building for /submit requests (scores, payments, new players).
 * Pure functions: no fetch, no database, so they are unit-tested against fixtures. The output is a Built: a typed change
 * for lib/writes.ts to apply, plus the human summary and message the submitter can drop in the group chat.
 */
export type Kind = "score" | "payment" | "player";
export type Built<C = ScoreChange | PaymentChange | PlayerChange> = { kind: Kind; subject: string; summary: string; text: string; submittedBy: string; change: C };
export type Rejected = { error: string };

export const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
export type Position = (typeof POSITIONS)[number];

export const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
export const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 30;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Match a submitted name to the roster case-insensitively; returns the roster's spelling. */
export function rosterName(name: unknown, roster: Iterable<string>): string | null {
  const n = norm(clean(name, 60)); if (!n) return null;
  for (const r of roster) if (norm(r) === n) return r;
  return null;
}
const isoDate = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
export const fmtDay = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pounds = (n: number) => `£${n.toFixed(2)}`;

/**
 * Same-origin gate for the POST routes. Browsers label where a request came from (Sec-Fetch-Site, then Origin), so anything
 * cross-site is refused; a request carrying neither header (curl, the admin's scripts) is let through and left to the rate limits.
 */
export function originAllowed(h: { get(name: string): string | null }): boolean {
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = h.get("origin");
  if (!origin) return true;
  let from: string;
  try { from = new URL(origin).host.toLowerCase(); } catch { return false; } // "null" (sandboxed iframe, opaque origin) lands here too
  const ours = [h.get("x-forwarded-host"), h.get("host")].flatMap((v) => (v ?? "").split(",")).map((v) => v.trim().toLowerCase()).filter(Boolean);
  return ours.includes(from);
}

/* -------------------------------------------------------------------- scores */
export type ScoreValue = { ours: number; theirs: number; scorers: Record<string, number>; assists: Record<string, number>; played: string[]; motm: string | null; note: string; submittedBy: string };
export function validateScore(body: Record<string, unknown>, known: (name: string) => boolean): { ok: true; value: ScoreValue } | { ok: false; error: string } {
  const ours = body.ours, theirs = body.theirs;
  if (!isCount(ours) || !isCount(theirs)) return { ok: false, error: "Scores must be whole numbers between 0 and 30." };
  const asCounts = (v: unknown) => Object.fromEntries(Object.entries((v ?? {}) as Record<string, unknown>).filter((e): e is [string, number] => isCount(e[1]) && e[1] > 0).map(([n, v]) => [clean(n, 40), v]));
  const scorers = asCounts(body.scorers), assists = asCounts(body.assists);
  const played = [...new Set([...(Array.isArray(body.played) ? body.played : []).map((s) => clean(s, 40)), ...Object.keys(scorers), ...Object.keys(assists)])].filter(Boolean);
  const motm = body.motm ? clean(body.motm, 40) : null;
  const unknown = [...Object.keys(scorers), ...Object.keys(assists), ...played, ...(motm ? [motm] : [])].filter((n) => !known(n));
  if (unknown.length) return { ok: false, error: `Not on the roster: ${[...new Set(unknown)].join(", ")}. Add them under "New player" first.` };
  const goalsLogged = Object.values(scorers).reduce((t, v) => t + v, 0), assistsLogged = Object.values(assists).reduce((t, v) => t + v, 0);
  if (goalsLogged > ours) return { ok: false, error: `Scorers add up to ${goalsLogged} but we scored ${ours}.` };
  if (assistsLogged > ours) return { ok: false, error: "More assists than goals. Ambitious." };
  if (played.length > 12) return { ok: false, error: "That is a lot of players for six-a-side." };
  const submittedBy = clean(body.submittedBy, 40);
  if (submittedBy.length < 2) return { ok: false, error: "Tell us who you are." };
  return { ok: true, value: { ours, theirs, scorers, assists, played, motm, note: clean(body.note, 200), submittedBy } };
}
export function buildScoreMessage(v: ScoreValue, m: Pick<Match, "id" | "seasonId" | "gw" | "opponent" | "date" | "played">, when: string): Built<ScoreChange> {
  const list = (o: Record<string, number>) => Object.entries(o).map(([n, c]) => `${n}${c > 1 ? ` ×${c}` : ""}`).join(", ");
  const summary = `Hajduci ${v.ours}–${v.theirs} ${m.opponent} · ${m.seasonId === "FR" ? "Friendly" : `${m.seasonId} GW${m.gw}`} · ${when}`;
  const lines = [
    `SCORE${m.played ? " (correction)" : ""}`,
    summary,
    Object.keys(v.scorers).length ? `Scorers: ${list(v.scorers)}` : "Scorers: none logged",
    Object.keys(v.assists).length ? `Assists: ${list(v.assists)}` : null,
    v.motm ? `MOTM: ${v.motm}` : null,
    v.played.length ? `Played: ${v.played.join(", ")}` : null,
    v.note ? `Note: ${v.note}` : null,
    `Submitted by ${v.submittedBy}`,
  ].filter((l): l is string => l !== null);
  return { kind: "score", subject: `Score: ${summary}`, summary, text: lines.join("\n"), submittedBy: v.submittedBy, change: { matchId: m.id, ours: v.ours, theirs: v.theirs, scorers: v.scorers, assists: v.assists, played: v.played, motm: v.motm, comment: v.note || null } };
}

/* ------------------------------------------------------------------ payments */
/** `to` is who received the money; null when the form did not say (the message then falls back to the season's pitch payer). */
export type PaymentValue = { player: string; to: string | null; amount: number; date: string; note: string; submittedBy: string };
export function validatePayment(body: Record<string, unknown>, roster: Iterable<string>, today: string): { ok: true; value: PaymentValue } | { ok: false; error: string } {
  const player = rosterName(body.player, roster);
  if (!player) return { ok: false, error: "Pick a player from the list." };
  const to = body.to === undefined || body.to === null || body.to === "" ? null : rosterName(body.to, roster);
  if (to === null && body.to) return { ok: false, error: "Pick who was paid from the list." };
  if (to && to === player) return { ok: false, error: "Paying yourself does not count, sadly." };
  const raw = typeof body.amount === "string" ? Number(body.amount.replace(/[£,\s]/g, "")) : body.amount;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return { ok: false, error: "Enter an amount in pounds." };
  const amount = Math.round(raw * 100) / 100;
  if (amount < 0.01) return { ok: false, error: "Amounts start at a penny." };
  if (amount > 500) return { ok: false, error: "That is more than anyone owes. Check the amount." };
  const date = clean(body.date, 10);
  if (!isoDate(date)) return { ok: false, error: "Pick the date you paid." };
  if (date > today) return { ok: false, error: "That date is in the future." };
  if (daysBetween(date, today) > 400) return { ok: false, error: "That payment is more than a year old. Ask the admin directly." };
  const submittedBy = clean(body.submittedBy, 40);
  if (submittedBy.length < 2) return { ok: false, error: "Tell us who you are." };
  return { ok: true, value: { player, to, amount, date, note: clean(body.note, 120), submittedBy } };
}
export type PaymentContext = { payer: string | null; balance: number | null };
export function buildPaymentMessage(v: PaymentValue, ctx: PaymentContext): Built<PaymentChange> {
  const to = v.to ?? ctx.payer;
  const summary = `${v.player} paid ${pounds(v.amount)}${to ? ` to ${to}` : ""} · ${fmtDay(v.date)}`;
  const after = ctx.balance === null ? null : Math.round((ctx.balance - v.amount) * 100) / 100;
  const lines = [
    "PAYMENT",
    summary,
    to ? `From ${v.player} to ${to}${ctx.payer && to !== ctx.payer ? ` (not ${ctx.payer}, who is down as this season's pitch payer; check who should be credited)` : ""}` : `Recipient not given${ctx.payer ? "" : " and no pitch payer is named for this season"}.`,
    ctx.balance === null ? null : ctx.balance > 0.01 ? `Owed before this: ${pounds(ctx.balance)}${after !== null ? ` → ${after > 0.01 ? `${pounds(after)} still to pay` : after < -0.01 ? `${pounds(-after)} overpaid` : "settled"}` : ""}` : `Nothing was outstanding for ${v.player}${ctx.balance < -0.01 ? ` (already ${pounds(-ctx.balance)} in credit)` : ""}. Check this one.`,
    v.note ? `Reference: ${v.note}` : null,
    `Submitted by ${v.submittedBy}`,
  ].filter((l): l is string => l !== null);
  return { kind: "payment", subject: `Payment: ${summary}`, summary, text: lines.join("\n"), submittedBy: v.submittedBy, change: { player: v.player, to, amount: v.amount, date: v.date, note: v.note } };
}

/* ---------------------------------------------------------------- new players */
export type PlayerValue = { name: string; nickname: string; positions: Position[]; shirt: number | null; photo: string; note: string; submittedBy: string };
export function validatePlayer(body: Record<string, unknown>, roster: Iterable<string>, shirts: Map<number, string>): { ok: true; value: PlayerValue } | { ok: false; error: string } {
  const name = clean(body.name, 40).replace(/\s*-\s*/g, "-");
  if (name.length < 2) return { ok: false, error: "Add the player's name." };
  if (!/^\p{L}[\p{L}\p{M}' .-]*$/u.test(name) || !/\p{L}.*\p{L}/u.test(name)) return { ok: false, error: "Names are letters, spaces, apostrophes and hyphens." };
  if (!name.includes(" ")) return { ok: false, error: "First name and surname, please. Two Toms is how the records get muddled." };
  const clash = rosterName(name, roster);
  if (clash) return { ok: false, error: `${clash} is already in the squad.` };
  const nickname = clean(body.nickname, 24);
  const wanted = Array.isArray(body.positions) ? body.positions.map((p) => clean(p, 4).toUpperCase()) : [];
  const positions = POSITIONS.filter((p) => wanted.includes(p));
  if (wanted.some((p) => !POSITIONS.includes(p as Position))) return { ok: false, error: "Positions are GK, DEF, MID or FWD." };
  let shirt: number | null = null;
  if (body.shirt !== null && body.shirt !== undefined && body.shirt !== "") {
    const n = typeof body.shirt === "string" ? Number(body.shirt) : body.shirt;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 99) return { ok: false, error: "Shirt numbers run 1 to 99." };
    const worn = shirts.get(n);
    if (worn) return { ok: false, error: `${n} is ${worn}'s shirt. Pick another.` };
    shirt = n;
  }
  const photo = clean(body.photo, 300);
  if (photo) { let u: URL | null = null; try { u = new URL(photo); } catch { u = null; } if (!u || u.protocol !== "https:") return { ok: false, error: "Photo needs to be an https link." }; }
  const submittedBy = clean(body.submittedBy, 40);
  if (submittedBy.length < 2) return { ok: false, error: "Tell us who you are." };
  return { ok: true, value: { name, nickname, positions, shirt, photo, note: clean(body.note, 200), submittedBy } };
}
export type PlayerContext = { seasonId: string | null };
export function buildPlayerMessage(v: PlayerValue, ctx: PlayerContext): Built<PlayerChange> {
  const summary = `New player: ${v.name}${v.shirt ? ` (#${v.shirt})` : ""}${ctx.seasonId ? ` · joins for ${ctx.seasonId}` : ""}`;
  const lines = [
    "NEW PLAYER",
    summary,
    v.nickname ? `Nickname: ${v.nickname}` : null,
    v.positions.length ? `Position: ${v.positions.join("/")}` : "Position: not given",
    v.photo ? `Photo: ${v.photo}` : null,
    v.note ? `Note: ${v.note}` : null,
    `Submitted by ${v.submittedBy}`,
  ].filter((l): l is string => l !== null);
  return { kind: "player", subject: summary, summary, text: lines.join("\n"), submittedBy: v.submittedBy, change: { name: v.name, nickname: v.nickname, positions: [...v.positions], shirt: v.shirt, photo: v.photo, seasonId: ctx.seasonId } };
}
