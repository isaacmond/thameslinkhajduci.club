// Opens the man-of-the-match vote for a fixture and emails the ballots, exactly as recording the score would have:
// `npx tsx --env-file=.env.local scripts/open-motm.mts <matchId> [--dry]`. --dry only reports who would get a ballot.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { setDb } from "../src/lib/db";
import { afterScoreRecorded, openMotmPoll } from "../src/lib/motm-polls";

const [matchId, flag] = process.argv.slice(2);
if (!matchId) throw new Error("usage: open-motm.mts <matchId> [--dry]");
setDb(drizzle({ client: neon(process.env.DATABASE_URL!), schema, casing: "snake_case" }));
if (flag === "--dry") {
  // Peek without writing: read the fixture the way openMotmPoll does, but stop before it creates anything.
  const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema, casing: "snake_case" });
  const { eq } = await import("drizzle-orm");
  const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  const lines = await db.select().from(schema.appearances).where(eq(schema.appearances.matchId, matchId));
  const members = await db.select().from(schema.members);
  const emails = (p: string) => members.filter((x) => x.player.toLowerCase() === p.toLowerCase()).map((x) => x.email);
  const [poll] = await db.select().from(schema.motmPolls).where(eq(schema.motmPolls.matchId, matchId));
  console.log({ match: m && `${m.seasonId} GW${m.gw} · Hajduci ${m.ourGoals}–${m.theirGoals} ${m.opponent} · ${m.date} · type ${m.type ?? "league"} · MOTM ${m.motm ?? "none"}`, existingPoll: poll ?? null, played: lines.filter((l) => l.played).map((l) => `${l.player}: ${emails(l.player).join(", ") || "NO EMAIL"}`) });
} else {
  const r = await afterScoreRecorded(matchId, "Isaac Mond (script)");
  console.log({ outcome: r.result.outcome, message: r.message, sent: r.sent.sent, failed: r.sent.failed, noEmail: r.result.noEmail, closesAt: r.result.closesAt });
}
void openMotmPoll;
