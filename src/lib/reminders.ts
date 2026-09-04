import { Resend } from "resend";
import { SITE_URL } from "./config";
import { getData } from "./data";
import { knownMembers } from "./auth";
import { fmtDate, gwLabel } from "./stats";
import { londonToday } from "./time";
import { getSquad, markReminded } from "./writes";
import { log } from "./log";

/**
 * The day-before email to everyone on a fixture's team sheet. Sent by the daily cron (/api/cron/reminders) for tomorrow's
 * games, or by the admin's "Send now" button. Only players with an address on the members list can be emailed; the rest are
 * reported back so the admin can chase them in the group chat.
 */
export type ReminderResult = { sent: string[]; noEmail: string[]; failed: string[]; skipped?: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export async function sendSquadReminders(matchId: string): Promise<ReminderResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: [], noEmail: [], failed: [], skipped: "RESEND_API_KEY is not set" };
  const [data, squad, members] = await Promise.all([getData(), getSquad(matchId), knownMembers()]);
  const m = data.matches.find((x) => x.id === matchId);
  if (!m) return { sent: [], noEmail: [], failed: [], skipped: `No fixture ${matchId}` };
  if (!squad || squad.players.length === 0) return { sent: [], noEmail: [], failed: [], skipped: "No team sheet for that fixture yet" };
  const season = m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const emailsOf = (player: string) => members.find((x) => x.player.toLowerCase() === player.toLowerCase())?.emails ?? [];

  const today = londonToday();
  const tomorrow = m.date === new Date(Date.parse(today + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  const when = `${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })}${m.kickOff ? `, ${m.kickOff} kick-off` : ""}`;
  const comp = m.seasonId === "FR" ? "Friendly" : `${season?.title || m.seasonId} · ${gwLabel(m)}`;
  const venue = season?.venue || "the usual place";
  const subject = `${tomorrow ? "Tomorrow" : fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })}: Hajduci v ${m.opponent}${m.kickOff ? `, ${m.kickOff}` : ""}`;
  const squadLines = squad.players.map((p) => { const x = byName.get(p); return { name: p, shirt: x?.extra.shirt ?? null, pos: x?.extra.positions?.join("/") ?? "" }; });
  const from = process.env.SCORE_FROM_EMAIL ?? "Thameslink Hajduci <onboarding@resend.dev>";
  const resend = new Resend(key);
  const result: ReminderResult = { sent: [], noEmail: [], failed: [] };

  for (const player of squad.players) {
    const to = emailsOf(player);
    if (!to.length) { result.noEmail.push(player); continue; }
    const first = player.split(" ")[0];
    const rows = squadLines.map((s) => `<tr><td style="padding:6px 10px;font-family:ui-monospace,Menlo,monospace;color:#f4c81b;width:2.5em">${s.shirt ?? ""}</td><td style="padding:6px 10px;${s.name === player ? "color:#7fe0a3;font-weight:700" : ""}">${esc(s.name)}${s.name === player ? " (you)" : ""}</td><td style="padding:6px 10px;color:#a7b8ab">${esc(s.pos)}</td></tr>`).join("");
    const html = `<!doctype html><html><body style="margin:0;background:#06140c;color:#f6f1e6;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#a7b8ab">Team sheet · Thameslink Hajduci</p>
    <h1 style="margin:0 0 6px;font-size:30px;line-height:1.05">Hajduci <span style="color:#a7b8ab;font-weight:400">v</span> ${esc(m.opponent)}</h1>
    <p style="margin:0 0 18px;font-size:15px;color:#a7b8ab">${tomorrow ? "Tomorrow. " : ""}You're in the squad, ${esc(first)}.</p>
    <table style="width:100%;border-collapse:collapse;background:#0d2b19;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:14px">
      <tr><td style="padding:10px 12px;color:#a7b8ab;width:7em">When</td><td style="padding:10px 12px;font-weight:600">${esc(when)}</td></tr>
      <tr><td style="padding:10px 12px;color:#a7b8ab;border-top:1px solid rgba(255,255,255,.08)">Where</td><td style="padding:10px 12px;border-top:1px solid rgba(255,255,255,.08)">${esc(venue)}</td></tr>
      <tr><td style="padding:10px 12px;color:#a7b8ab;border-top:1px solid rgba(255,255,255,.08)">Game</td><td style="padding:10px 12px;border-top:1px solid rgba(255,255,255,.08)">${esc(comp)}</td></tr>
    </table>
    <h2 style="margin:22px 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a7b8ab">The squad · ${squad.players.length}</h2>
    <table style="width:100%;border-collapse:collapse;background:#0d2b19;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:14px">${rows}</table>
    ${squad.note ? `<div style="margin:18px 0 0;padding:12px 14px;border-left:3px solid #32c364;background:rgba(50,195,100,.08);border-radius:8px;font-size:14px;line-height:1.5">${esc(squad.note)}</div>` : ""}
    <p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/matches/${esc(m.id)}" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Fixture page</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:#f6f1e6">Can't make it? Say so in the group chat as early as you can, so someone else can be found. Boots, shin pads, and a spare in case it's a bibs night.</p>
    <p style="margin:14px 0 0;font-size:12px;color:#a7b8ab">You're getting this because you're on the team sheet at <a href="${esc(SITE_URL)}" style="color:#7fe0a3">thameslinkhajduci.club</a>. Running approximately twelve minutes behind schedule since 2024.</p>
  </div></body></html>`;
    const text = [`Hajduci v ${m.opponent}${tomorrow ? " (tomorrow)" : ""}`, `You're in the squad, ${first}.`, "", `When: ${when}`, `Where: ${venue}`, `Game: ${comp}`, "", `Squad (${squad.players.length}):`, ...squadLines.map((s) => `  ${s.shirt ? `#${s.shirt} ` : ""}${s.name}${s.pos ? ` (${s.pos})` : ""}`), ...(squad.note ? ["", squad.note] : []), "", `${SITE_URL}/matches/${m.id}`, "", "Can't make it? Say so in the group chat as early as you can."].join("\n");
    try {
      const { error } = await resend.emails.send({ from, to, subject, html, text });
      if (error) { console.error("reminder:", player, error); result.failed.push(player); } else result.sent.push(player);
    } catch (err) { console.error("reminder:", player, err); result.failed.push(player); }
  }
  if (result.sent.length) await markReminded(matchId);
  log("reminders.sent", { matchId, sent: result.sent.length, noEmail: result.noEmail.length, failed: result.failed.length });
  return result;
}
