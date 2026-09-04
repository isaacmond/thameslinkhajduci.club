// One-off: read the workbook (SHEET_FILE, or the live Google export) and load it into DATABASE_URL, replacing what is there.
// Run: SHEET_FILE=sheet-fixes/thameslink-hajduci-corrected.xlsx npx tsx scripts/import-sheet.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { fetchWorkbook, lastParsedAliases, parseWorkbook, ALIASES, OPPONENTS } from "../src/lib/sheet";
import { importClubData } from "../src/lib/db-import";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = drizzle({ client: neon(url), schema, casing: "snake_case" });
const data = parseWorkbook(await fetchWorkbook());
const fromSheet = lastParsedAliases();
const result = await importClubData(db, data, { aliases: { ...ALIASES, ...fromSheet.players }, opponents: { ...OPPONENTS, ...fromSheet.opponents } });
console.log("imported", result);
