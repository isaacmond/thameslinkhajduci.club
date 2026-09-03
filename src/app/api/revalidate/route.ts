import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** Force a re-read of the sheet (the cache otherwise refreshes itself every minute). */
export async function POST() {
  revalidateTag("sheet", "max");
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
export const GET = POST;
