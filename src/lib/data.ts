import { getClubData } from "./sheet";
import type { ClubData } from "./types";

/**
 * Single entry point for pages. Every page calls this; Next's fetch cache dedupes the
 * request per render and keeps it warm for REVALIDATE_SECONDS, so the sheet is the only
 * source of truth and there is nothing to upload or sync.
 */
export async function getData(): Promise<ClubData> {
  return getClubData();
}
