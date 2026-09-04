"use server";
import { signOut } from "@workos-inc/authkit-nextjs";
import { currentSession } from "@/lib/auth";
import { getData } from "@/lib/data";
import { slugify } from "@/lib/slug";

export type Me = { email: string; name: string; player: string | null; slug: string | null; photo: string | null; admin: boolean };

/** Who is signed in, as the client components need it: the linked player and their photo, or null. */
export async function whoAmI(): Promise<Me | null> {
  const s = await currentSession();
  if (!s) return null;
  const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email;
  if (!s.member) return { email: s.email, name, player: null, slug: null, photo: null, admin: false };
  const data = await getData();
  const p = data.players.find((x) => x.name === s.member!.player);
  return { email: s.email, name, player: s.member.player, slug: p?.slug ?? slugify(s.member.player), photo: p?.extra.photo ?? null, admin: Boolean(s.member.admin) };
}

export async function signOutAction() {
  await signOut();
}
