// Emails one team-sheet reminder preview: `npx tsx scripts/preview-reminder.mts <to> [player] [matchId]` (env from .env.local).
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import * as schema from "../src/db/schema";
import { setDb } from "../src/lib/db";
import { loadClubData } from "../src/lib/db-data";
import { getSquad } from "../src/lib/writes";
import { REMINDER_FROM, renderReminder } from "../src/lib/reminder-email";

const [to, player = "Isaac Mond", matchId] = process.argv.slice(2);
if (!to) throw new Error("usage: preview-reminder.mts <to> [player] [matchId]");
setDb(drizzle({ client: neon(process.env.DATABASE_URL!), schema, casing: "snake_case" }));
const data = await loadClubData();
const today = new Date().toISOString().slice(0, 10);
const m = data.matches.find((x) => x.id === matchId) ?? data.matches.filter((x) => !x.played && x.date && x.date >= today).sort((a, b) => a.date!.localeCompare(b.date!))[0];
if (!m) throw new Error("no upcoming fixture");
const saved = await getSquad(m.id);
const current = data.seasons.find((s) => s.isCurrent) ?? data.seasons.at(-1);
const players = saved?.players.length ? saved.players : [player, ...(current?.players ?? []).filter((p) => p !== player)].slice(0, 7);
const note = saved?.note ?? null;
const mail = renderReminder({ data, match: m, players, note, player });
const { data: sent, error } = await new Resend(process.env.RESEND_API_KEY!).emails.send({ from: REMINDER_FROM, to: [to], ...mail, subject: `[Preview] ${mail.subject}` });
console.log(error ? { error } : { sent: sent?.id, from: REMINDER_FROM, subject: mail.subject, players });
