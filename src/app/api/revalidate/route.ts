import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** Force a re-read of the sheet (the cache otherwise refreshes itself every minute). expire: 0 makes the very next request block on a fresh read instead of serving stale-while-revalidate. */
export async function POST() {
  revalidateTag("sheet", { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
export const GET = POST;
