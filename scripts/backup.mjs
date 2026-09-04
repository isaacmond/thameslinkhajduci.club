// Daily off-site copy of the records. Runs when Claude Code opens this project (see .claude/settings.json) and by hand
// via `npm run backup`. Downloads the live site's full workbook and JSON into a folder that Google Drive syncs, once per
// day; never fails the session (any problem just prints a note and exits 0).
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const site = process.env.HAJDUCI_SITE_URL ?? "https://thameslinkhajduci.club";
const dir = process.env.HAJDUCI_BACKUP_DIR ?? join(homedir(), "Documents", "Documents", "Thameslink Hajduci");
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // yyyy-mm-dd
const say = (msg) => console.log(JSON.stringify({ systemMessage: msg }));

try {
  mkdirSync(dir, { recursive: true });
  const xlsx = join(dir, `records-${today}.xlsx`), json = join(dir, `records-${today}.json`);
  if (existsSync(xlsx) && existsSync(json) && !process.argv.includes("--force")) { say(`Records backup for ${today} already in ${dir}`); process.exit(0); }
  const get = async (path) => { const r = await fetch(`${site}${path}`, { signal: AbortSignal.timeout(25_000) }); if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); };
  const [wb, data] = await Promise.all([get("/api/export?format=xlsx"), get("/api/data?pretty=1")]);
  if (wb.length < 10_000 || data.length < 10_000) throw new Error("download looked too small to be the records");
  writeFileSync(xlsx, wb); writeFileSync(json, data);
  copyFileSync(xlsx, join(dir, "records-latest.xlsx")); copyFileSync(json, join(dir, "records-latest.json"));
  say(`Records backed up to ${dir} (records-${today}.xlsx, ${(wb.length / 1024).toFixed(0)} KB)`);
} catch (err) {
  say(`Records backup skipped: ${err instanceof Error ? err.message : String(err)}`);
}
