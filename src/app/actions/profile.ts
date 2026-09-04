"use server";
import { put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { currentMember } from "@/lib/auth";
import { getData } from "@/lib/data";
import { dbConfigured } from "@/lib/db";
import { updateProfile } from "@/lib/writes";
import { log } from "@/lib/log";
import { slugify } from "@/lib/slug";
import { clean, POSITIONS, type Position } from "@/lib/submissions";

export type ProfileState = { ok: boolean; message: string; photo?: string | null } | null;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Save the signed-in member's own profile: their players row (photo in Blob storage), plus their name in WorkOS. */
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const s = await currentMember();
  if (!s) return { ok: false, message: "Sign in with an email address on the club list first." };
  if (!dbConfigured()) return { ok: false, message: "Profile editing is not switched on yet: the records database is not connected. Ask Isaac." };

  const firstName = clean(form.get("firstName"), 40), lastName = clean(form.get("lastName"), 40);
  const nickname = clean(form.get("nickname"), 40);
  const positions = form.getAll("positions").map(String).filter((p): p is Position => (POSITIONS as readonly string[]).includes(p));
  const shirtRaw = clean(form.get("shirt"), 3);
  const bio = clean(form.get("bio"), 280);
  const removePhoto = form.get("removePhoto") === "on";
  const file = form.get("photo");

  let shirt: number | null = null;
  if (shirtRaw) {
    const n = Number(shirtRaw);
    if (!Number.isInteger(n) || n < 1 || n > 99) return { ok: false, message: "Shirt numbers run from 1 to 99." };
    const data = await getData();
    const clash = data.players.find((p) => p.name !== s.member.player && p.extra.shirt === n);
    if (clash) return { ok: false, message: `${clash.name} already wears ${n}. Pick another number or take it up with them.` };
    shirt = n;
  }

  let photo: string | undefined;
  if (removePhoto) photo = "";
  else if (file instanceof File && file.size > 0) {
    const ext = PHOTO_TYPES[file.type];
    if (!ext) return { ok: false, message: "Photos need to be JPEG, PNG or WebP." };
    if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: "That photo is over 5 MB. Shrink it a little first." };
    try {
      const blob = await put(`players/${slugify(s.member.player)}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
      photo = blob.url;
    } catch (err) { console.error("blob:", err); return { ok: false, message: "The photo upload failed. Try again in a moment." }; }
  }

  try {
    await updateProfile(s.member.player, { nickname, positions, shirt, bio, ...(photo !== undefined ? { photo } : {}) }, s.email);
  } catch (err) {
    console.error("profile write:", err);
    return { ok: false, message: "Could not save to the records. Try again in a moment." };
  }

  if ((firstName && firstName !== (s.firstName ?? "")) || (lastName && lastName !== (s.lastName ?? ""))) {
    try { await getWorkOS().userManagement.updateUser({ userId: s.userId, firstName: firstName || undefined, lastName: lastName || undefined }); }
    catch (err) { console.error("workos updateUser:", err); }
  }

  revalidateTag("sheet", { expire: 0 });
  revalidatePath("/", "layout");
  log("profile.saved", { player: s.member.player, photo: photo !== undefined });
  return { ok: true, message: "Saved. Your page updates within a minute.", photo: photo === "" ? null : photo };
}
