import { SITE_URL } from "./config";
import { fmtDate, gwLabel } from "./stats";
import { londonToday } from "./time";
import type { ClubData, Match } from "./types";

/** The team-sheet reminder email, rendered for one recipient. Pure, so previews, the cron and the tests all use the same thing. */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Who a reminder goes out as. Team-sheet mail has its own address; score submissions keep scores@. */
export const REMINDER_FROM = process.env.MATCHES_FROM_EMAIL ?? "Thameslink Hajduci <matches@thameslinkhajduci.club>";

export type ReminderInput = { data: ClubData; match: Match; players: string[]; note: string | null; player: string };
/** The email itself, for one recipient. Pure, so a preview and the real send render identically. */
export function renderReminder({ data, match: m, players, note, player }: ReminderInput): { subject: string; html: string; text: string } {
  const season = m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const today = londonToday();
  const tomorrow = m.date === new Date(Date.parse(today + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  const when = `${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })}${m.kickOff ? `, ${m.kickOff} kick-off` : ""}`;
  const comp = m.seasonId === "FR" ? "Friendly" : `${season?.title || m.seasonId} · ${gwLabel(m)}`;
  const venue = season?.venue || "the usual place";
  const subject = `${tomorrow ? "Tomorrow" : fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })}: Hajduci v ${m.opponent}${m.kickOff ? `, ${m.kickOff}` : ""}`;
  const squadLines = players.map((p) => { const x = byName.get(p); return { name: p, shirt: x?.extra.shirt ?? null, pos: x?.extra.positions?.join("/") ?? "" }; });
  const first = player.split(" ")[0];
  const rows = squadLines.map((s) => `<tr><td style="padding:6px 10px;font-family:ui-monospace,Menlo,monospace;color:#9c7210;width:2.5em">${s.shirt ?? ""}</td><td style="padding:6px 10px;${s.name === player ? "color:#1f5135;font-weight:700" : ""}">${esc(s.name)}${s.name === player ? " (you)" : ""}</td><td style="padding:6px 10px;color:#64716a">${esc(s.pos)}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f1e8;color:#17221b;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64716a">Team sheet · Thameslink Hajduci</p>
    <h1 style="margin:0 0 6px;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:1.05">Hajduci <span style="color:#64716a;font-weight:400">v</span> ${esc(m.opponent)}</h1>
    <p style="margin:0 0 18px;font-size:15px;color:#64716a">${tomorrow ? "Tomorrow. " : ""}You're in the squad, ${esc(first)}.</p>
    <table style="width:100%;border-collapse:collapse;background:#fffcf6;border:1px solid rgba(23,34,27,.12);border-radius:10px;font-size:14px">
      <tr><td style="padding:10px 12px;color:#64716a;width:7em">When</td><td style="padding:10px 12px;font-weight:600">${esc(when)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64716a;border-top:1px solid rgba(23,34,27,.08)">Where</td><td style="padding:10px 12px;border-top:1px solid rgba(23,34,27,.08)">${season?.venueUrl ? `<a href="${esc(season.venueUrl)}" style="color:#1f5135;text-decoration:underline">${esc(venue)}</a>` : esc(venue)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64716a;border-top:1px solid rgba(23,34,27,.08)">Game</td><td style="padding:10px 12px;border-top:1px solid rgba(23,34,27,.08)">${esc(comp)}</td></tr>
    </table>
    <h2 style="margin:22px 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#64716a">The squad · ${players.length}</h2>
    <table style="width:100%;border-collapse:collapse;background:#fffcf6;border:1px solid rgba(23,34,27,.12);border-radius:10px;font-size:14px">${rows}</table>
    ${note ? `<div style="margin:18px 0 0;padding:12px 14px;border-left:3px solid #1f5135;background:rgba(31,81,53,.06);border-radius:8px;font-size:14px;line-height:1.5">${esc(note)}</div>` : ""}
    <p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/matches/${esc(m.id)}" style="display:inline-block;background:#1f5135;color:#f5f1e8;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px">Fixture page</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:#17221b">Meet 15 minutes before kick-off. No proper shirt? Bring a white one.</p>
    <p style="margin:10px 0 0;font-size:13px;color:#64716a">Can't make it? Say so in the group chat as early as you can, so someone else can be found.</p>
    <p style="margin:14px 0 0;font-size:12px;color:#64716a">You're getting this because you're on the team sheet at <a href="${esc(SITE_URL)}" style="color:#1f5135">thameslinkhajduci.club</a>.</p>
  </div></body></html>`;
  const text = [`Hajduci v ${m.opponent}${tomorrow ? " (tomorrow)" : ""}`, `You're in the squad, ${first}.`, "", `When: ${when}`, `Where: ${venue}${season?.venueUrl ? ` (${season.venueUrl})` : ""}`, `Game: ${comp}`, "", `Squad (${players.length}):`, ...squadLines.map((s) => `  ${s.shirt ? `#${s.shirt} ` : ""}${s.name}${s.pos ? ` (${s.pos})` : ""}`), ...(note ? ["", note] : []), "", `${SITE_URL}/matches/${m.id}`, "", "Meet 15 minutes before kick-off. No proper shirt? Bring a white one.", "Can't make it? Say so in the group chat as early as you can."].join("\n");
  return { subject, html, text };
}

