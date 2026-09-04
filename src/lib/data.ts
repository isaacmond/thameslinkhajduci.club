import { unstable_cache } from "next/cache";
import { cache } from "react";
import { dbConfigured } from "./db";
import { loadClubData } from "./db-data";
import { getClubData } from "./sheet";
import { log } from "./log";
import type { ClubData } from "./types";

/**
 * Single entry point for pages. The database is the source of truth; its ClubData is cached for a minute under the
 * tag "sheet" (kept from the spreadsheet days so every revalidate call still works) and every write purges it.
 * Without DATABASE_URL the site still reads the Google Sheet, which is how it ran before the import.
 */
const REVALIDATE_SECONDS = 60;
const cachedLoad = unstable_cache(async () => {
  const t0 = Date.now();
  const data = await loadClubData();
  log("db.load", { ms: Date.now() - t0, seasons: data.seasons.length, matches: data.matches.length, players: data.players.length });
  return data;
}, ["club-data"], { tags: ["sheet"], revalidate: REVALIDATE_SECONDS });

let lastGood: ClubData | null = null;
export const getData = cache(async (): Promise<ClubData> => {
  if (!dbConfigured()) return getClubData();
  try { const data = await cachedLoad(); lastGood = data; return data; }
  catch (err) { log("db.load.failed", { error: String(err) }); if (lastGood) return { ...lastGood, stale: true }; throw err; }
});
