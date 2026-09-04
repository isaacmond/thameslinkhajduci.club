import { withAuth } from "@workos-inc/authkit-nextjs";
import { memberFor, type Member } from "./members";

/** Sign-in is on only when WorkOS is fully configured; without it every page behaves as before and the account UI is hidden. */
export function authEnabled(): boolean {
  return Boolean(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID && process.env.WORKOS_COOKIE_PASSWORD);
}

export type Session = { userId: string; email: string; firstName: string | null; lastName: string | null; member: Member | null };
export type MemberSession = Session & { member: Member };

/** The signed-in user, or null when nobody is signed in, auth is off, or this request was not covered by the proxy. Never throws. */
export async function currentSession(): Promise<Session | null> {
  if (!authEnabled()) return null;
  try {
    const { user } = await withAuth();
    if (!user) return null;
    return { userId: user.id, email: user.email, firstName: user.firstName ?? null, lastName: user.lastName ?? null, member: memberFor(user.email) };
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
