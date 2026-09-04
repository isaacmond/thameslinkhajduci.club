import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { originAllowed } from "@/lib/submissions";

/**
 * Force a re-read of the sheet (the cache otherwise refreshes itself every minute).
 * POST only, same-origin only (the refresh button on /data), and throttled to one purge per 20 seconds per instance so nobody can
 * hammer Google's export through us. REVALIDATE_SECRET (optional) in an x-revalidate-secret header lets the admin call it from
 * anywhere and skips the throttle.
 */
let lastPurge = 0;
const secretOk = (given: string | null, secret: string | undefined) => {
  if (!given || !secret) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};
export async function POST(req: Request) {
  const now = Date.now();
  const privileged = secretOk(req.headers.get("x-revalidate-secret"), process.env.REVALIDATE_SECRET);
  if (!privileged && !originAllowed(req.headers)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (!privileged && now - lastPurge < 20_000) return NextResponse.json({ ok: true, skipped: true, retryInMs: 20_000 - (now - lastPurge), at: new Date(now).toISOString() });
  lastPurge = now;
  revalidateTag("sheet", { expire: 0 });
  revalidatePath("/", "layout"); // pages prerendered at build time came from the snapshot and carry no "sheet" tag, so purge every page under the root layout too
  log("sheet.revalidate", { privileged });
  return NextResponse.json({ ok: true, skipped: false, at: new Date(now).toISOString() });
}
