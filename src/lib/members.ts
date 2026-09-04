/**
 * Who may sign in: the `members` table, managed by the admin on /admin. Each address is tied to a player name exactly as
 * it appears in the records. A signed-in member can edit their own profile and their submissions (scores, payments, new
 * players) are written straight into the records instead of going to the admin for approval. `admin` marks the club admin.
 * Nothing is hard-coded here: these are the shapes and pure helpers the auth layer and the tests share.
 */
export type Member = { player: string; emails: string[]; admin?: boolean };

export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.trim().length <= 120;

/** The member for an email address, or null when the address is not on the list. */
export function memberFor(email: string | null | undefined, members: Member[]): Member | null {
  if (!email) return null;
  const e = normEmail(email);
  if (!e) return null;
  return members.find((m) => m.emails.some((x) => normEmail(x) === e)) ?? null;
}

/** Rows of the members table grouped into one Member per player. */
export function groupMembers(rows: { email: string; player: string; admin: boolean }[]): Member[] {
  const byPlayer = new Map<string, Member>();
  for (const r of rows) {
    const key = r.player.trim().toLowerCase();
    const m = byPlayer.get(key) ?? { player: r.player.trim(), emails: [] };
    if (!m.emails.some((x) => normEmail(x) === normEmail(r.email))) m.emails.push(normEmail(r.email));
    if (r.admin) m.admin = true;
    byPlayer.set(key, m);
  }
  return [...byPlayer.values()].sort((a, b) => a.player.localeCompare(b.player));
}

/** Which player, if any, already owns this address in `members`. */
export function ownerOf(email: string, members: Member[]): string | null {
  return members.find((m) => m.emails.some((x) => normEmail(x) === normEmail(email)))?.player ?? null;
}
