/**
 * Validation and message building for /submit requests (scores, payments, new players).
 * Pure functions: no fetch, no sheet access, so they are unit-tested against fixtures.
 * Nothing here writes anywhere. The output is a request for the admin, with the exact cells to change.
 */
export type Edit = { cell: string; value: string | number; what: string };
export type Built = { subject: string; summary: string; text: string; edits: Edit[]; tab: string | null; submittedBy: string };
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
const quote = (v: string | number) => (typeof v === "string" ? `"${v}"` : String(v));
export const editsLine = (edits: Edit[], tab: string | null) => (edits.length ? `Sheet edits${tab ? ` (tab ${tab})` : ""}: ${edits.map((e) => `${e.cell}=${quote(e.value)}`).join(", ")}` : "Sheet edits: could not map cells, apply by hand");
/** A cell value starting with = + - or @ would run as a formula when the admin pastes it; a leading apostrophe makes a spreadsheet keep it as text. */
export const cellSafe = (s: string) => (/^[=+\-@]/.test(s) ? `'${s}` : s);

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

/* ------------------------------------------------------------------ payments */
export type PaymentValue = { player: string; amount: number; date: string; note: string; submittedBy: string };
export function validatePayment(body: Record<string, unknown>, roster: Iterable<string>, today: string): { ok: true; value: PaymentValue } | { ok: false; error: string } {
  const player = rosterName(body.player, roster);
  if (!player) return { ok: false, error: "Pick a player from the list." };
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
  return { ok: true, value: { player, amount, date, note: clean(body.note, 120), submittedBy } };
}
export type PaymentContext = { payer: string | null; balance: number | null; edits: Edit[]; tab: string | null; sheetUrl: string };
export function buildPaymentMessage(v: PaymentValue, ctx: PaymentContext): Built {
  const summary = `${v.player} paid ${pounds(v.amount)}${ctx.payer ? ` to ${ctx.payer}` : ""} · ${fmtDay(v.date)}`;
  const after = ctx.balance === null ? null : Math.round((ctx.balance - v.amount) * 100) / 100;
  const lines = [
    "PAYMENT SUBMISSION",
    summary,
    ctx.balance === null ? null : ctx.balance > 0.01 ? `Owed before this: ${pounds(ctx.balance)}${after !== null ? ` → ${after > 0.01 ? `${pounds(after)} still to pay` : after < -0.01 ? `${pounds(-after)} overpaid` : "settled"}` : ""}` : `Nothing was outstanding for ${v.player}${ctx.balance < -0.01 ? ` (already ${pounds(-ctx.balance)} in credit)` : ""}. Check this one.`,
    v.note ? `Reference: ${v.note}` : null,
    `Submitted by ${v.submittedBy}`,
    "",
    editsLine(ctx.edits, ctx.tab),
    ctx.sheetUrl,
  ].filter((l): l is string => l !== null);
  return { subject: `Payment: ${summary}`, summary, text: lines.join("\n"), edits: ctx.edits, tab: ctx.tab, submittedBy: v.submittedBy };
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
export type PlayerContext = { seasonId: string | null; edits: Edit[]; warnings: string[]; sheetUrl: string };
export function buildPlayerMessage(v: PlayerValue, ctx: PlayerContext): Built {
  const summary = `New player: ${v.name}${v.shirt ? ` (#${v.shirt})` : ""}${ctx.seasonId ? ` · joins for ${ctx.seasonId}` : ""}`;
  const lines = [
    "NEW PLAYER SUBMISSION",
    summary,
    v.nickname ? `Nickname: ${v.nickname}` : null,
    v.positions.length ? `Position: ${v.positions.join("/")}` : "Position: not given",
    v.photo ? `Photo: ${v.photo}` : null,
    v.note ? `Note: ${v.note}` : null,
    `Submitted by ${v.submittedBy}`,
    "",
    editsLine(ctx.edits, null),
    ...ctx.warnings,
    ctx.sheetUrl,
  ].filter((l): l is string => l !== null);
  return { subject: summary, summary, text: lines.join("\n"), edits: ctx.edits, tab: null, submittedBy: v.submittedBy };
}
