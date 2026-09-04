// Downloads the workbook once at build time so a Google hiccup at runtime can never leave a cold function with no data at all.
// Falls back to the corrected copy in sheet-fixes/ if Google is unreachable during the build.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
if (process.env.DATABASE_URL) { console.log("snapshot: database configured, no workbook needed"); process.exit(0); }
const id = process.env.SHEET_ID ?? process.env.NEXT_PUBLIC_SHEET_ID ?? "1nCwz2uInlh3gePYORxvW3_0SlpFS8KgRxCCoccvw9zA";
mkdirSync(".snapshot", { recursive: true });
try {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { headers: { "user-agent": "thameslinkhajduci.club/snapshot" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(".snapshot/sheet.xlsx", Buffer.from(await res.arrayBuffer()));
  writeFileSync(".snapshot/meta.json", JSON.stringify({ fetchedAt: new Date().toISOString(), source: "google" }));
  console.log("snapshot: workbook saved");
} catch (err) {
  if (existsSync("sheet-fixes/thameslink-hajduci-corrected.xlsx")) { copyFileSync("sheet-fixes/thameslink-hajduci-corrected.xlsx", ".snapshot/sheet.xlsx"); writeFileSync(".snapshot/meta.json", JSON.stringify({ fetchedAt: new Date().toISOString(), source: "sheet-fixes fallback", error: String(err) })); console.warn("snapshot: Google unreachable, using sheet-fixes copy:", String(err)); }
  else console.warn("snapshot: skipped:", String(err));
}
