import { Resend } from "resend";
import { getData } from "./data";
import { knownMembers } from "./auth";
import { getSquad, markReminded } from "./writes";
import type { ClubData } from "./types";
import { REMINDER_FROM, renderReminder } from "./reminder-email";
import { log } from "./log";

/**
 * The day-before email to everyone on a fixture's team sheet. Sent by the daily cron (/api/cron/reminders) for tomorrow's
 * games, or by the admin's "Send now" button. Only players with an address on the members list can be emailed; the rest are
 * reported back so the admin can chase them in the group chat.
 */
export type ReminderResult = { sent: string[]; noEmail: string[]; failed: string[]; skipped?: string };

export async function sendSquadReminders(matchId: string): Promise<ReminderResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: [], noEmail: [], failed: [], skipped: "RESEND_API_KEY is not set" };
  const [data, squad, members] = await Promise.all([getData(), getSquad(matchId), knownMembers()]);
  const m = data.matches.find((x) => x.id === matchId);
  if (!m) return { sent: [], noEmail: [], failed: [], skipped: `No fixture ${matchId}` };
  if (!squad || squad.players.length === 0) return { sent: [], noEmail: [], failed: [], skipped: "No team sheet for that fixture yet" };
  const emailsOf = (player: string) => members.find((x) => x.player.toLowerCase() === player.toLowerCase())?.emails ?? [];
  const resend = new Resend(key);
  const result: ReminderResult = { sent: [], noEmail: [], failed: [] };
  for (const player of squad.players) {
    const to = emailsOf(player);
    if (!to.length) { result.noEmail.push(player); continue; }
    const mail = renderReminder({ data, match: m, players: squad.players, note: squad.note, player });
    try {
      const { error } = await resend.emails.send({ from: REMINDER_FROM, to, ...mail });
      if (error) { console.error("reminder:", player, error); result.failed.push(player); } else result.sent.push(player);
    } catch (err) { console.error("reminder:", player, err); result.failed.push(player); }
  }
  if (result.sent.length) await markReminded(matchId);
  log("reminders.sent", { matchId, sent: result.sent.length, noEmail: result.noEmail.length, failed: result.failed.length });
  return result;
}

/**
 * One copy to one address, as if `as` were on the team sheet: the saved squad if there is one, otherwise a sample of the
 * current season's regulars. Nothing is saved or marked; it is for seeing the email before the squad does.
 */
export async function sendReminderPreview(matchId: string, to: string, as: string, data?: ClubData): Promise<{ ok: boolean; message: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, message: "RESEND_API_KEY is not set" };
  const d = data ?? (await getData());
  const m = d.matches.find((x) => x.id === matchId);
  if (!m) return { ok: false, message: `No fixture ${matchId}` };
  const saved = await getSquad(matchId).catch(() => null);
  const current = d.seasons.find((s) => s.isCurrent) ?? d.seasons.at(-1);
  const sample = [as, ...(current?.players ?? []).filter((p) => p !== as)].slice(0, 7);
  const players = saved?.players.length ? (saved.players.includes(as) ? saved.players : [as, ...saved.players]) : sample;
  const note = saved?.note ?? null;
  const mail = renderReminder({ data: d, match: m, players, note, player: as });
  const { error } = await new Resend(key).emails.send({ from: REMINDER_FROM, to: [to], ...mail, subject: `[Preview] ${mail.subject}` });
  if (error) { console.error("reminder preview:", error); return { ok: false, message: "Resend refused the preview." }; }
  return { ok: true, message: `Preview sent to ${to} from ${REMINDER_FROM.replace(/.*<|>.*/g, "")}${saved?.players.length ? " using the saved team sheet" : " with a sample squad"}.` };
}
