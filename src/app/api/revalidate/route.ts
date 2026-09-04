import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { log } from "@/lib/log";

/**
 * Force a re-read of the sheet (the cache otherwise refreshes itself every minute).
 * POST only, and throttled to one purge per 20 seconds per instance so nobody can hammer Google's export through us;
 * REVALIDATE_SECRET (optional) in an x-revalidate-secret header bypasses the throttle for the admin.
 */
let lastPurge = 0;
export async function POST(req: Request) {
  const now = Date.now();
  const secret = process.env.REVALIDATE_SECRET;
  const privileged = Boolean(secret) && req.headers.get("x-revalidate-secret") === secret;
  if (!privileged && now - lastPurge < 20_000) return NextResponse.json({ ok: true, skipped: true, retryInMs: 20_000 - (now - lastPurge), at: new Date(now).toISOString() });
  lastPurge = now;
  revalidateTag("sheet", { expire: 0 });
  log("sheet.revalidate", { privileged });
  return NextResponse.json({ ok: true, skipped: false, at: new Date(now).toISOString() });
}
