import { SITE_URL } from "./config";
import { fixtureLabel, fmtDate } from "./stats";
import { londonToday } from "./time";
import type { ClubData, Match } from "./types";
import { ACCENT_TINT, BUTTON, CARD, EMAIL, EYEBROW, H1, LINE_SOFT, LINK, emailClose, emailOpen } from "./email-styles";

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
  const comp = fixtureLabel(m);
  const venue = season?.venue || "Venue to be confirmed";
  const subject = `${tomorrow ? "Tomorrow" : fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })}: Hajduci v ${m.opponent}${m.kickOff ? `, ${m.kickOff}` : ""}`;
  const squadLines = players.map((p) => { const x = byName.get(p); return { name: p, shirt: x?.extra.shirt ?? null, pos: x?.extra.positions?.join("/") ?? "" }; });
  const first = player.split(" ")[0];
  const rows = squadLines.map((s) => `<tr><td style="padding:6px 10px;font-variant-numeric:tabular-nums;color:${EMAIL.gold};width:2.5em">${s.shirt ?? ""}</td><td style="padding:6px 10px;${s.name === player ? `color:${EMAIL.accent};font-weight:700` : ""}">${esc(s.name)}${s.name === player ? " (you)" : ""}</td><td style="padding:6px 10px;color:${EMAIL.muted}">${esc(s.pos)}</td></tr>`).join("");
  const html = `${emailOpen()}
    <p style="margin:0 0 6px;${EYEBROW}">Team sheet · Thameslink Hajduci</p>
    <h1 style="margin:0 0 6px;${H1}">Hajduci <span style="color:${EMAIL.muted};font-weight:400">v</span> ${esc(m.opponent)}</h1>
    <p style="margin:0 0 18px;font-size:15px;color:${EMAIL.muted}">${tomorrow ? "Tomorrow. " : ""}You're in the squad, ${esc(first)}.</p>
    <table style="width:100%;border-collapse:collapse;${CARD};font-size:14px">
      <tr><td style="padding:10px 12px;color:${EMAIL.muted};width:7em">When</td><td style="padding:10px 12px;font-weight:600">${esc(when)}</td></tr>
      <tr><td style="padding:10px 12px;color:${EMAIL.muted};border-top:1px solid ${LINE_SOFT}">Where</td><td style="padding:10px 12px;border-top:1px solid ${LINE_SOFT}">${season?.venueUrl ? `<a href="${esc(season.venueUrl)}" style="${LINK};text-decoration:underline">${esc(venue)}</a>` : esc(venue)}</td></tr>
      <tr><td style="padding:10px 12px;color:${EMAIL.muted};border-top:1px solid ${LINE_SOFT}">Match</td><td style="padding:10px 12px;border-top:1px solid ${LINE_SOFT}">${esc(comp)}</td></tr>
    </table>
    <h2 style="margin:22px 0 8px;${EYEBROW}">The squad · ${players.length}</h2>
    <table style="width:100%;border-collapse:collapse;${CARD};font-size:14px">${rows}</table>
    ${note ? `<div style="margin:18px 0 0;padding:12px 14px;border-left:3px solid ${EMAIL.accent};background:${ACCENT_TINT};border-radius:8px;font-size:14px;line-height:1.5">${esc(note)}</div>` : ""}
    <p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/matches/${esc(m.id)}" style="${BUTTON}">Match page</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:${EMAIL.ink}">Meet 15 minutes before kick-off. No proper shirt? Bring a white one.</p>
    <p style="margin:10px 0 0;font-size:13px;color:${EMAIL.muted}">Can't make it? Say so in the group chat as early as you can, so someone else can be found.</p>
    <p style="margin:14px 0 0;font-size:12px;color:${EMAIL.muted}">You're getting this because you're on the team sheet at <a href="${esc(SITE_URL)}" style="${LINK}">thameslinkhajduci.club</a>.</p>${emailClose}`;
  const text = [`Hajduci v ${m.opponent}${tomorrow ? " (tomorrow)" : ""}`, `You're in the squad, ${first}.`, "", `When: ${when}`, `Where: ${venue}${season?.venueUrl ? ` (${season.venueUrl})` : ""}`, `Match: ${comp}`, "", `Squad (${players.length}):`, ...squadLines.map((s) => `  ${s.shirt ? `#${s.shirt} ` : ""}${s.name}${s.pos ? ` (${s.pos})` : ""}`), ...(note ? ["", note] : []), "", `${SITE_URL}/matches/${m.id}`, "", "Meet 15 minutes before kick-off. No proper shirt? Bring a white one.", "Can't make it? Say so in the group chat as early as you can."].join("\n");
  return { subject, html, text };
}

