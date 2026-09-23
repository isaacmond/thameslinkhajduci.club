// Adds an address to the members list, exactly as the admin's Members form does, including the ballot for any open
// man-of-the-match vote the player is in: `npx tsx --env-file=.env.local scripts/add-member.mts <email> "<Player Name>"`.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { setDb } from "../src/lib/db";
import { validEmail } from "../src/lib/members";
import { addMember } from "../src/lib/writes";
import { ballotsForNewMember } from "../src/lib/motm-polls";

const [email, player] = process.argv.slice(2);
if (!email || !player || !validEmail(email)) throw new Error('usage: add-member.mts <email> "<Player Name>"');
setDb(drizzle({ client: neon(process.env.DATABASE_URL!), schema, casing: "snake_case" }));
await addMember(email, player, false, "Isaac Mond (script)");
const notes = await ballotsForNewMember(player, "Isaac Mond (script)");
console.log({ added: `${email.trim().toLowerCase()} → ${player}`, ballots: notes });
