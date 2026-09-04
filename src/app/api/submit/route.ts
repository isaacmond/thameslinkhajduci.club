import { NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { getAdminLayout, getSheetLayout, SHEET_URL } from "@/lib/sheet";
import { fmtDate, gwLabel } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { emailScoreSubmission } from "@/lib/notify";
import { log } from "@/lib/log";
import { buildPaymentMessage, buildPlayerMessage, cellSafe, clean, editsLine, isCount, originAllowed, validatePayment, validatePlayer, type Built, type Edit, type Rejected } from "@/lib/submissions";
import type { ClubData } from "@/lib/types";

/**
 * Submissions: match results, payments and new players. Nothing is written anywhere by this site: each request is
 * validated against the real fixture list, roster and money table, turned into a human summary plus the exact cells to
 * change, then emailed to the admin (Resend via the Vercel Marketplace; SCORE_TO_EMAIL) and/or posted to SCORE_WEBHOOK_URL.
 * The reply carries the same text so the submitter can drop it in the group chat.
 */
type Body = Record<string, unknown>;
type Kind = "score" | "payment" | "player";

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  for (const [k, ts] of hits) if (now - ts[ts.length - 1] >= 60_000) hits.delete(k); // forget quiet addresses, so the map only ever holds the last minute
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 6;
}
/** Outbound notifications are the scarce resource (Resend's quota): at most NOTIFY_BUDGET an hour per instance, whatever the IPs say. Past that the request is still built and returned, just not sent. */
const NOTIFY_BUDGET = 20, NOTIFY_WINDOW_MS = 3_600_000;
let notified: number[] = [];
function notifyBudgetOk() {
  const now = Date.now(); notified = notified.filter((t) => now - t < NOTIFY_WINDOW_MS);
  if (notified.length >= NOTIFY_BUDGET) return false;
  notified.push(now); return true;
}
const currentSeason = (data: ClubData) => data.seasons.find((s) => s.isCurrent) ?? data.seasons.at(-1) ?? null;
const fullRoster = (data: ClubData) => [...new Set([...data.players.map((p) => p.name), ...(currentSeason(data)?.players ?? [])])];

async function buildScore(body: Body, data: ClubData): Promise<Built | Rejected> {
  const m = data.matches.find((x) => x.id === body.match);
  if (!m) return { error: "Pick a fixture from the list." };
  const ours = body.ours, theirs = body.theirs;
  if (!isCount(ours) || !isCount(theirs)) return { error: "Scores must be whole numbers between 0 and 30." };
  const roster = new Set(data.players.map((p) => p.name));
  const seasonRoster = new Set((m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId))?.players ?? []);
  const known = (n: string) => roster.has(n) || seasonRoster.has(n);
  const asCounts = (v: unknown) => Object.entries((v ?? {}) as Record<string, unknown>).filter((e): e is [string, number] => isCount(e[1]) && e[1] > 0);
  const scorers = asCounts(body.scorers), assists = asCounts(body.assists);
  const played = [...new Set([...(Array.isArray(body.played) ? body.played : []).map((s) => clean(s, 40)), ...scorers.map(([n]) => n), ...assists.map(([n]) => n)])].filter(Boolean);
  const motm = body.motm ? clean(body.motm, 40) : null;
  const unknown = [...scorers.map(([n]) => n), ...assists.map(([n]) => n), ...played, ...(motm ? [motm] : [])].filter((n) => !known(n));
  if (unknown.length) return { error: `Not on the roster: ${unknown.join(", ")}. Add them under "New player" first.` };
  const goalsLogged = scorers.reduce((t, [, v]) => t + v, 0), assistsLogged = assists.reduce((t, [, v]) => t + v, 0);
  if (goalsLogged > ours) return { error: `Scorers add up to ${goalsLogged} but we scored ${ours}.` };
  if (assistsLogged > ours) return { error: "More assists than goals. Ambitious." };
  if (played.length > 12) return { error: "That is a lot of players for six-a-side." };
  const submittedBy = clean(body.submittedBy, 40);
  if (submittedBy.length < 2) return { error: "Tell us who you are." };
  const note = clean(body.note, 200);

  // Exact cells to change, so the admin can apply it in seconds.
  const layout = await getSheetLayout(m.seasonId);
  const edits: Edit[] = [];
  if (layout) {
    const col = layout.gwCol(m.gw);
    if (col) {
      edits.push({ cell: `${col}${layout.rows.ourGoals}`, value: ours, what: "Our goals" }, { cell: `${col}${layout.rows.theirGoals}`, value: theirs, what: "Their goals" });
      if (motm) edits.push({ cell: `${col}${layout.rows.motm}`, value: cellSafe(motm), what: "MOTM" });
      if (note) edits.push({ cell: `${col}${layout.rows.comments}`, value: cellSafe(note), what: "Comment" });
      for (const name of played) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.apps}`, value: 1, what: `${name} played` }); }
      for (const [name, v] of scorers) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.goals}`, value: v, what: `${name} goals` }); }
      for (const [name, v] of assists) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.assists}`, value: v, what: `${name} assists` }); }
    }
  }
  const when = fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" });
  const summary = `Hajduci ${ours}–${theirs} ${m.opponent} · ${m.seasonId === "FR" ? "Friendly" : `${m.seasonId} ${gwLabel(m)}`} · ${when}`;
  const lines = [
    `SCORE SUBMISSION${m.played ? " (correction)" : ""}`,
    summary,
    scorers.length ? `Scorers: ${scorers.map(([n, v]) => `${n}${v > 1 ? ` ×${v}` : ""}`).join(", ")}` : "Scorers: none logged",
    assists.length ? `Assists: ${assists.map(([n, v]) => `${n}${v > 1 ? ` ×${v}` : ""}`).join(", ")}` : null,
    motm ? `MOTM: ${motm}` : null,
    played.length ? `Played: ${played.join(", ")}` : null,
    note ? `Note: ${note}` : null,
    `Submitted by ${submittedBy}`,
    "",
    editsLine(edits, layout?.tab ?? null),
    SHEET_URL,
  ].filter((l): l is string => l !== null);
  return { subject: `Score submission: ${summary}`, summary, text: lines.join("\n"), edits, tab: layout?.tab ?? null, submittedBy };
}

async function buildPayment(body: Body, data: ClubData): Promise<Built | Rejected> {
  const current = currentSeason(data);
  const v = validatePayment(body, fullRoster(data), londonToday());
  if (!v.ok) return { error: v.error };
  const payer = (current && data.money.paidBy[current.id]) || null;
  const row = data.money.rows.find((r) => r.player === v.value.player);
  const layout = await getAdminLayout(current?.id ?? null);
  const edits: Edit[] = [];
  if (layout.payments) {
    const { row: r, cols } = layout.payments;
    edits.push(
      { cell: `${cols.date}${r}`, value: cellSafe(v.value.date), what: "Date" },
      { cell: `${cols.player}${r}`, value: cellSafe(v.value.player), what: "Player" },
      { cell: `${cols.amount}${r}`, value: v.value.amount, what: "Amount (£)" },
      { cell: `${cols.note}${r}`, value: cellSafe([v.value.note, `via the site, submitted by ${v.value.submittedBy}`].filter(Boolean).join(" · ")), what: "Note" },
    );
  }
  return buildPaymentMessage(v.value, { payer, balance: row ? row.balance : null, edits, tab: layout.payments?.tab ?? null, sheetUrl: SHEET_URL });
}

async function buildPlayer(body: Body, data: ClubData): Promise<Built | Rejected> {
  const current = currentSeason(data);
  const shirts = new Map<number, string>();
  for (const p of data.players) if (p.extra.shirt) shirts.set(p.extra.shirt, p.name);
  const v = validatePlayer(body, fullRoster(data), shirts);
  if (!v.ok) return { error: v.error };
  const { roster: r } = await getAdminLayout(current?.id ?? null);
  const edits: Edit[] = [], warnings: string[] = [];
  const insert = (tab: string | null, row: number | null, what: string) => {
    if (!tab) return;
    if (row) edits.push({ cell: `${tab}!A${row}`, value: cellSafe(v.value.name), what });
    else warnings.push(`${tab}: no free row above Total. Insert one, then add the name.`);
  };
  insert(r.seasonTab, r.seasonRow, `Add to the ${r.seasonTab} roster (the goals and assists rows follow automatically)`);
  insert(r.allTimeTab, r.allTimeRow, "All-time roster");
  insert(r.moneyTab, r.moneyRow, "Money roster");
  const extras = [v.value.nickname && `nickname ${v.value.nickname}`, v.value.positions.length ? v.value.positions.join("/") : "", v.value.shirt ? `#${v.value.shirt}` : "", v.value.photo].filter(Boolean).join(", ");
  if (r.squadTab && r.squadRow) {
    const c = r.squadCols;
    const put = (key: string, value: string | number | null, what: string) => { if (value && c[key]) edits.push({ cell: `${r.squadTab}!${c[key]}${r.squadRow}`, value: typeof value === "string" ? cellSafe(value) : value, what }); };
    put("player", v.value.name, "Squad: name"); put("nickname", v.value.nickname, "Squad: nickname"); put("position", v.value.positions.join("/"), "Squad: position"); put("shirt", v.value.shirt, "Squad: shirt"); put("photo", v.value.photo, "Squad: photo");
  } else if (extras) {
    warnings.push(`Shirt, position, nickname and photo live in the site's squad file until there is a Squad tab (columns Player, Nickname, Position, Shirt, Photo, Bio). Details given: ${extras}.`);
  }
  return buildPlayerMessage(v.value, { seasonId: current?.id ?? null, edits, warnings, sheetUrl: SHEET_URL });
}

export async function POST(req: Request) {
  // Same-origin JSON only: the forms post from our own pages; a cross-site form post or a stray script gets nothing, before it costs a rate-limit slot.
  if (!originAllowed(req.headers) || !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "Steady on. Try again in a minute." }, { status: 429 });
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  if (body.website) return NextResponse.json({ ok: true, sent: false, summary: "", text: "", edits: [] }); // honeypot: pretend success, do nothing
  const kind: Kind = body.kind === "payment" || body.kind === "player" ? body.kind : "score";

  const data = await getData();
  const built = kind === "score" ? await buildScore(body, data) : kind === "payment" ? await buildPayment(body, data) : await buildPlayer(body, data);
  if ("error" in built) return NextResponse.json({ ok: false, error: built.error }, { status: 400 });

  const hook = process.env.SCORE_WEBHOOK_URL;
  const canNotify = notifyBudgetOk();
  if (!canNotify) log("submit.notify.budget", { kind, ip });
  const [emailed, hooked] = canNotify
    ? await Promise.all([
        emailScoreSubmission({ subject: built.subject, text: built.text, summary: built.summary, edits: built.edits, tab: built.tab, sheetUrl: SHEET_URL, submittedBy: built.submittedBy }),
        hook ? fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: built.text, content: built.text.slice(0, 1900) }) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false),
      ])
    : [false, false]; // over budget: the submitter still gets the text to copy or share, the admin just is not pinged
  return NextResponse.json({ ok: true, kind, sent: emailed || hooked, emailed, throttled: !canNotify, summary: built.summary, text: built.text, edits: built.edits, tab: built.tab, sheetUrl: SHEET_URL });
}
