/**
 * The weekly "who's in?" poll for the group chat, drafted the way it is always written:
 * "Thameslink Hajduci v TMHLR F.C. - 18:15, 15th September", options In and Out.
 * WhatsApp has no link or API that creates a poll, so the site copies the question and shows the layout to paste it into.
 * Pure: no dates from the clock, no I/O; the fixture's own yyyy-mm-dd and hh:mm are all it reads.
 */
export type PollFixture = { opponent: string; date: string | null; kickOff: string | null };
export const POLL_OPTIONS = ["In", "Out"] as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd, 23rd, 31st */
export function ordinal(day: number): string {
  const mod100 = day % 100, mod10 = day % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${day}${suffix}`;
}
/** "15th September" from "2026-09-15"; null when the fixture has no date yet. */
export function pollDay(iso: string | null): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${ordinal(Number(m[3]))} ${MONTHS[Number(m[2]) - 1]}`;
}
/** The poll question. Time and date are left out when the fixture does not have them yet. */
export function pollQuestion(f: PollFixture): string {
  const when = [f.kickOff, pollDay(f.date)].filter(Boolean).join(", ");
  return `Thameslink Hajduci v ${f.opponent}${when ? ` - ${when}` : ""}`;
}
/** A plain message for chats where a poll is not wanted: the question and the two answers on their own lines. */
export function pollMessage(f: PollFixture): string {
  return `${pollQuestion(f)}\n${POLL_OPTIONS.join(" or ")}?`;
}
