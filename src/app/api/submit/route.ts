import { NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { dbConfigured } from "@/lib/db";
import { fmtDate } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { emailSubmission } from "@/lib/notify";
import { log } from "@/lib/log";
import { currentMember } from "@/lib/auth";
import { queueSubmission } from "@/lib/writes";
import { applyChange } from "@/lib/apply";
import { buildPaymentMessage, buildPlayerMessage, buildScoreMessage, clean, originAllowed, validatePayment, validatePlayer, validateScore, type Built, type Kind, type Rejected } from "@/lib/submissions";
import { SITE_URL } from "@/lib/config";
import type { ClubData } from "@/lib/types";

/**
 * Submissions: match results, payments and new players. Each request is validated against the real fixture list, roster
 * and money table and turned into a typed change plus a human summary. A signed-in member's change is written to the
 * records immediately; anyone else's goes into the approval queue on the admin's account page. The admin is emailed
 * either way, and the reply carries the summary so the submitter can drop it in the group chat.
 */
type Body = Record<string, unknown>;

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  for (const [k, ts] of hits) if (now - ts[ts.length - 1] >= 60_000) hits.delete(k); // forget quiet addresses, so the map only ever holds the last minute
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 6;
}
/** Outbound notifications are the scarce resource (Resend's quota): at most NOTIFY_BUDGET an hour per instance, whatever the IPs say. */
const NOTIFY_BUDGET = 20, NOTIFY_WINDOW_MS = 3_600_000;
let notified: number[] = [];
function notifyBudgetOk() {
  const now = Date.now(); notified = notified.filter((t) => now - t < NOTIFY_WINDOW_MS);
  if (notified.length >= NOTIFY_BUDGET) return false;
  notified.push(now); return true;
}
const currentSeason = (data: ClubData) => data.seasons.find((s) => s.isCurrent) ?? data.seasons.at(-1) ?? null;
const fullRoster = (data: ClubData) => [...new Set([...data.players.map((p) => p.name), ...(currentSeason(data)?.players ?? [])])];

function buildScore(body: Body, data: ClubData): Built | Rejected {
  const m = data.matches.find((x) => x.id === body.match);
  if (!m) return { error: "Pick a fixture from the list." };
  const roster = new Set(data.players.map((p) => p.name));
  const seasonRoster = new Set((m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId))?.players ?? []);
  const v = validateScore(body, (n) => roster.has(n) || seasonRoster.has(n));
  if (!v.ok) return { error: v.error };
  return buildScoreMessage(v.value, m, fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" }));
}
function buildPayment(body: Body, data: ClubData): Built | Rejected {
  const current = currentSeason(data);
  const v = validatePayment(body, fullRoster(data), londonToday());
  if (!v.ok) return { error: v.error };
  const payer = (current && data.money.paidBy[current.id]) || null;
  const row = data.money.rows.find((r) => r.player === v.value.player);
  return buildPaymentMessage(v.value, { payer, balance: row ? row.balance : null });
}
function buildPlayer(body: Body, data: ClubData): Built | Rejected {
  const current = currentSeason(data);
  const shirts = new Map<number, string>();
  for (const p of data.players) if (p.extra.shirt) shirts.set(p.extra.shirt, p.name);
  const v = validatePlayer(body, fullRoster(data), shirts);
  if (!v.ok) return { error: v.error };
  return buildPlayerMessage(v.value, { seasonId: current?.id ?? null });
}

export async function POST(req: Request) {
  // Same-origin JSON only: the forms post from our own pages; a cross-site form post or a stray script gets nothing, before it costs a rate-limit slot.
  if (!originAllowed(req.headers) || !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "Steady on. Try again in a minute." }, { status: 429 });
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  if (body.website) return NextResponse.json({ ok: true, sent: false, summary: "", text: "" }); // honeypot: pretend success, do nothing
  const kind: Kind = body.kind === "payment" || body.kind === "player" ? body.kind : "score";
  // Signed-in members need not say who they are; the session does.
  const member = await currentMember();
  if (member && clean(body.submittedBy, 40).length < 2) body.submittedBy = member.member.player;

  const data = await getData();
  const built = kind === "score" ? buildScore(body, data) : kind === "payment" ? buildPayment(body, data) : buildPlayer(body, data);
  if ("error" in built) return NextResponse.json({ ok: false, error: built.error }, { status: 400 });

  let applied = false, queued = false, queueId: number | null = null, applyError: string | null = null;
  if (dbConfigured()) {
    try {
      if (member) { await applyChange(built, `${member.member.player} <${member.email}>`); applied = true; log("submit.applied", { kind, player: member.member.player }); }
      else { queueId = await queueSubmission(kind, built.change as unknown as Record<string, unknown>, built.summary, built.submittedBy); queued = true; log("submit.queued", { kind, id: queueId }); }
    } catch (err) {
      console.error("submit write:", err);
      applyError = "Could not write to the records.";
      log("submit.write.failed", { kind, member: member?.member.player ?? null });
    }
  }
  const submittedBy = member ? `${built.submittedBy} (${member.member.player}, signed in)` : built.submittedBy;
  const status = applied ? `Recorded in the records by ${member!.member.player}, signed in as ${member!.email}.` : queued ? `Waiting for the admin to approve it: ${SITE_URL}/admin` : applyError ? `${applyError} Please apply it by hand.` : "Awaiting the admin.";
  const text = `${built.text}\n\n${status}`;
  const subject = applied ? built.subject.replace(/^([^:]+):/, "$1 recorded:") : queued ? built.subject.replace(/^([^:]+):/, "$1 to approve:") : built.subject;

  const hook = process.env.SCORE_WEBHOOK_URL;
  const canNotify = notifyBudgetOk();
  if (!canNotify) log("submit.notify.budget", { kind, ip });
  const [emailed, hooked] = canNotify
    ? await Promise.all([
        emailSubmission({ subject, text, summary: built.summary, submittedBy, kind, applied, queued }),
        hook ? fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text.slice(0, 1900) }) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false),
      ])
    : [false, false]; // over budget: the submitter still gets the text to copy or share, the admin just is not pinged
  return NextResponse.json({ ok: true, kind, sent: emailed || hooked, emailed, applied, appliedBy: applied ? member!.member.player : null, queued, applyError, throttled: !canNotify, summary: built.summary, text });
}
