import { NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { getSheetLayout, SHEET_URL } from "@/lib/sheet";
import { fmtDate, gwLabel } from "@/lib/stats";
import { emailScoreSubmission } from "@/lib/notify";

/**
 * Score submissions. Nothing is written anywhere by this site: the request is validated against the real fixture list
 * and roster, turned into a human summary plus the exact cells to change, then emailed to the admin (Resend via the Vercel
 * Marketplace; SCORE_TO_EMAIL) and/or posted to SCORE_WEBHOOK_URL. The reply also carries the text so the submitter can drop it in the group chat.
 */
type Body = { match?: string; ours?: number; theirs?: number; scorers?: Record<string, number>; assists?: Record<string, number>; played?: string[]; motm?: string | null; submittedBy?: string; note?: string; website?: string };

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now(); const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 6;
}
const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 30;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "Steady on. Try again in a minute." }, { status: 429 });
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  if (body.website) return NextResponse.json({ ok: true, sent: false, summary: "", text: "", edits: [] }); // honeypot: pretend success, do nothing

  const data = await getData();
  const m = data.matches.find((x) => x.id === body.match);
  if (!m) return NextResponse.json({ ok: false, error: "Pick a fixture from the list." }, { status: 400 });
  if (!isCount(body.ours) || !isCount(body.theirs)) return NextResponse.json({ ok: false, error: "Scores must be whole numbers between 0 and 30." }, { status: 400 });
  const roster = new Set(data.players.map((p) => p.name));
  const seasonRoster = new Set((m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId))?.players ?? []);
  const known = (n: string) => roster.has(n) || seasonRoster.has(n);
  const scorers = Object.entries(body.scorers ?? {}).filter(([, v]) => isCount(v) && v > 0);
  const assists = Object.entries(body.assists ?? {}).filter(([, v]) => isCount(v) && v > 0);
  const played = [...new Set([...(Array.isArray(body.played) ? body.played : []).map((s) => clean(s, 40)), ...scorers.map(([n]) => n), ...assists.map(([n]) => n)])].filter(Boolean);
  const unknown = [...scorers.map(([n]) => n), ...assists.map(([n]) => n), ...played, ...(body.motm ? [body.motm] : [])].filter((n) => !known(n));
  if (unknown.length) return NextResponse.json({ ok: false, error: `Not on the roster: ${unknown.join(", ")}. New players are added by the admin first.` }, { status: 400 });
  const goalsLogged = scorers.reduce((t, [, v]) => t + v, 0), assistsLogged = assists.reduce((t, [, v]) => t + v, 0);
  if (goalsLogged > body.ours) return NextResponse.json({ ok: false, error: `Scorers add up to ${goalsLogged} but we scored ${body.ours}.` }, { status: 400 });
  if (assistsLogged > body.ours) return NextResponse.json({ ok: false, error: `More assists than goals. Ambitious.` }, { status: 400 });
  if (played.length > 12) return NextResponse.json({ ok: false, error: "That is a lot of players for six-a-side." }, { status: 400 });
  const submittedBy = clean(body.submittedBy, 40);
  if (submittedBy.length < 2) return NextResponse.json({ ok: false, error: "Tell us who you are." }, { status: 400 });
  const note = clean(body.note, 200);
  const motm = body.motm ? clean(body.motm, 40) : null;

  // Exact cells to change, so the admin can apply it in seconds.
  const layout = await getSheetLayout(m.seasonId);
  const edits: { cell: string; value: string | number; what: string }[] = [];
  if (layout) {
    const col = layout.gwCol(m.gw);
    if (col) {
      edits.push({ cell: `${col}${layout.rows.ourGoals}`, value: body.ours, what: "Our goals" }, { cell: `${col}${layout.rows.theirGoals}`, value: body.theirs, what: "Their goals" });
      if (motm) edits.push({ cell: `${col}${layout.rows.motm}`, value: motm, what: "MOTM" });
      if (note) edits.push({ cell: `${col}${layout.rows.comments}`, value: note, what: "Comment" });
      for (const name of played) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.apps}`, value: 1, what: `${name} played` }); }
      for (const [name, v] of scorers) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.goals}`, value: v, what: `${name} goals` }); }
      for (const [name, v] of assists) { const r = layout.playerRows(name); if (r) edits.push({ cell: `${col}${r.assists}`, value: v, what: `${name} assists` }); }
    }
  }
  const when = fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" });
  const summary = `Hajduci ${body.ours}–${body.theirs} ${m.opponent} · ${m.seasonId === "FR" ? "Friendly" : `${m.seasonId} ${gwLabel(m)}`} · ${when}`;
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
    layout ? `Sheet edits (tab ${layout.tab}): ${edits.map((e) => `${e.cell}=${typeof e.value === "string" ? `"${e.value}"` : e.value}`).join(", ")}` : "Sheet edits: could not map cells, apply by hand",
    SHEET_URL,
  ].filter((l): l is string => l !== null);
  const text = lines.join("\n");

  const hook = process.env.SCORE_WEBHOOK_URL;
  const [emailed, hooked] = await Promise.all([
    emailScoreSubmission({ subject: `Score submission: ${summary}`, text, summary, edits, tab: layout?.tab ?? null, sheetUrl: SHEET_URL, submittedBy }),
    hook ? fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text.slice(0, 1900) }) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false),
  ]);
  const sent = emailed || hooked;
  return NextResponse.json({ ok: true, sent, emailed, summary, text, edits, tab: layout?.tab ?? null, sheetUrl: SHEET_URL });
}
