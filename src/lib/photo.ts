import { put } from "@vercel/blob";
import { slugify } from "./slug";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** A player photo from a form upload, stored in Blob. Returns its URL, or an error message for the person uploading. */
export async function uploadPlayerPhoto(player: string, file: File): Promise<{ url: string } | { error: string }> {
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { error: "Photos need to be JPEG, PNG or WebP." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "That photo is over 5 MB. Shrink it a little first." };
  try {
    const blob = await put(`players/${slugify(player)}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
    return { url: blob.url };
  } catch (err) { console.error("blob:", err); return { error: "The photo upload failed. Try again in a moment." }; }
}
