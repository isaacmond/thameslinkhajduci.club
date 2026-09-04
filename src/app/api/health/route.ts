import { NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { sheetHealth } from "@/lib/health";

/**
 * Liveness for uptime monitors: can the site read the records, how fresh are they, and how many things look off.
 * Never cached. 503 only when the records cannot be read at all (not even the stale copy).
 */
export async function GET() {
  const headers = { "cache-control": "no-store" };
  try {
    const data = await getData();
    const health = sheetHealth(data);
    return NextResponse.json(
      { ok: true, fetchedAt: data.fetchedAt, stale: data.stale ?? false, seasons: data.seasons.length, players: data.players.length, matches: data.matches.length, issues: health.counts, checkedAt: health.checkedAt },
      { headers },
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 503, headers });
  }
}
