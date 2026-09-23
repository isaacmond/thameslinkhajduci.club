// Emails a man-of-the-match preview: `npx tsx --env-file=.env.local scripts/preview-motm.mts <to> [ballot|result] [player] [matchId]`.
// Reads the latest league result from the records; nothing is written, and the ballot link is a dummy that lands on a 404.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import * as schema from "../src/db/schema";
import { setDb } from "../src/lib/db";
import { loadClubData } from "../src/lib/db-data";
import { REMINDER_FROM } from "../src/lib/reminder-email";
import { MOTM_POLL_HOURS, renderBallot, renderResult } from "../src/lib/motm";

const [to, kind = "ballot", player = "Isaac Mond", matchId] = process.argv.slice(2);
if (!to) throw new Error("usage: preview-motm.mts <to> [ballot|result] [player] [matchId]");
setDb(drizzle({ client: neon(process.env.DATABASE_URL!), schema, casing: "snake_case" }));
const data = await loadClubData();
const m = data.matches.find((x) => x.id === matchId) ?? [...data.matches].filter((x) => x.played && x.countsForRecords && x.lineup.some((l) => l.played)).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
if (!m) throw new Error("no played league game");
const candidates = m.lineup.filter((l) => l.played).map((l) => ({ player: l.player, goals: l.goals, assists: l.assists })).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
const voter = candidates.some((c) => c.player === player) ? player : candidates[0].player;
const mail = kind === "result"
  ? renderResult({ match: m, winner: candidates[0].player, counts: candidates.map((c, i) => ({ player: c.player, votes: Math.max(0, 3 - i) })), ballots: candidates.length, reason: "everyone voted" })
  : renderBallot({ match: m, voter, candidates, token: "preview-only-not-a-real-ballot", closesAt: new Date(Date.now() + MOTM_POLL_HOURS * 3_600_000) });
const { data: sent, error } = await new Resend(process.env.RESEND_API_KEY!).emails.send({ from: REMINDER_FROM, to: [to], ...mail, subject: `[Preview] ${mail.subject}` });
console.log(error ? { error } : { sent: sent?.id, from: REMINDER_FROM, subject: mail.subject, match: m.id, voter, candidates: candidates.map((c) => c.player) });
