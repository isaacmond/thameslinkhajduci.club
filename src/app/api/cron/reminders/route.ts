import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dbConfigured } from "@/lib/db";
import { londonToday } from "@/lib/time";
import { squadsNeedingReminder } from "@/lib/writes";
import { sendSquadReminders } from "@/lib/reminders";

/**
 * Daily (vercel.json crons, 08:00 UTC): email the team sheet to everyone picked for tomorrow's games. Vercel calls it with
 * `Authorization: Bearer CRON_SECRET`; nothing else may. `?date=yyyy-mm-dd` targets another day, for checking by hand.
 */
export const dynamic = "force-dynamic";

const authorised = (h: Headers) => {
  const secret = process.env.CRON_SECRET;
  const given = (h.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(req: Request) {
  if (!authorised(req.headers)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date(Date.parse(londonToday() + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  const due = await squadsNeedingReminder(date);
  const results = [];
  for (const s of due) results.push({ matchId: s.matchId, opponent: s.opponent, ...(await sendSquadReminders(s.matchId)) });
  return NextResponse.json({ ok: true, date, games: results });
}
