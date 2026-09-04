/**
 * Who may sign in. Each entry ties one or more email addresses to a player name exactly as it appears in the sheet.
 * A signed-in member can edit their own profile and their submissions (scores, payments, new players) are written
 * straight into the records instead of going to the admin for approval. `admin` marks the club admin.
 *
 * To add someone: add a line here (or set MEMBERS_JSON on Vercel to a JSON array of the same shape for additions
 * without a deploy). Matching is case-insensitive on the whole address.
 */
export type Member = { player: string; emails: string[]; admin?: boolean };

export const MEMBERS: Member[] = [
  { player: "Isaac Mond", emails: ["sacdpuntas@gmail.com", "isaacjlmond@gmail.com"], admin: true },
  { player: "Phil Knott", emails: ["philknott1997@hotmail.com"] },
];

function extraMembers(): Member[] {
  const raw = process.env.MEMBERS_JSON;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is Member => typeof m === "object" && m !== null && typeof (m as Member).player === "string" && Array.isArray((m as Member).emails));
  } catch { return []; }
}

export function allMembers(): Member[] { return [...MEMBERS, ...extraMembers()]; }

/** The member for an email address, or null when the address is not on the list. */
export function memberFor(email: string | null | undefined, members: Member[] = allMembers()): Member | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  if (!e) return null;
  return members.find((m) => m.emails.some((x) => x.trim().toLowerCase() === e)) ?? null;
}
