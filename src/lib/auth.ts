import { withAuth } from "@workos-inc/authkit-nextjs";
import { dbConfigured } from "./db";
import { listMembers } from "./writes";
import { groupMembers, memberFor, type Member } from "./members";

/** Sign-in is on only when WorkOS is fully configured; without it every page behaves as before and the account UI is hidden. */
export function authEnabled(): boolean {
  return Boolean(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID && process.env.WORKOS_COOKIE_PASSWORD);
}

export type Session = { userId: string; email: string; firstName: string | null; lastName: string | null; member: Member | null };
export type MemberSession = Session & { member: Member };

/** The members list from the database (the only place it lives), briefly memoised per instance. */
let memo: { at: number; members: Member[] } | null = null;
export async function knownMembers(): Promise<Member[]> {
  if (memo && Date.now() - memo.at < 15_000) return memo.members;
  let members: Member[] = [];
  if (dbConfigured()) {
    try { members = groupMembers(await listMembers()); }
    catch (err) { console.error("members:", err); }
  }
  memo = { at: Date.now(), members };
  return members;
}
export function forgetMembers() { memo = null; }

export async function resolveMember(email: string | null | undefined): Promise<Member | null> {
  return memberFor(email, await knownMembers());
}

/** The signed-in user, or null when nobody is signed in, auth is off, or this request was not covered by the proxy. Never throws. */
export async function currentSession(): Promise<Session | null> {
  if (!authEnabled()) return null;
  try {
    const { user } = await withAuth();
    if (!user) return null;
    return { userId: user.id, email: user.email, firstName: user.firstName ?? null, lastName: user.lastName ?? null, member: await resolveMember(user.email) };
  } catch (err) {
    console.error("auth:", err);
    return null;
  }
}

/** Like currentSession, but only for people on the members list. */
export async function currentMember(): Promise<MemberSession | null> {
  const s = await currentSession();
  return s?.member ? { ...s, member: s.member } : null;
}
