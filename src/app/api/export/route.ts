import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getData } from "@/lib/data";
import { buildTable, TABLES, type TableName } from "@/lib/tables";

/**
 * Tabular export. /api/export?table=players&format=csv|json|md&season=S7
 * Tables: players, matches, seasons, appearances, goals, opponents, money, payments
 * /api/export?format=xlsx downloads every table as one workbook, a tab each: the spreadsheet the records used to live in.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const table = (url.searchParams.get("table") ?? "players") as TableName;
  const format = url.searchParams.get("format") ?? "csv";
  const season = url.searchParams.get("season") ?? undefined;
  if (format === "xlsx") {
    const data = await getData();
    const wb = XLSX.utils.book_new();
    for (const t of TABLES) { const { columns, rows } = buildTable(data, t, { season }); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(columns.map((c) => [c, null]))], { header: columns }), t); }
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="thameslink-hajduci-records${season ? "-" + season : ""}.xlsx"`, "cache-control": "no-store" } });
  }
  if (!TABLES.includes(table)) return NextResponse.json({ error: `unknown table. one of: ${TABLES.join(", ")}` }, { status: 400 });
  const data = await getData();
  const { columns, rows } = buildTable(data, table, { season });
  const cache = { "cache-control": "public, s-maxage=60, stale-while-revalidate=300", "access-control-allow-origin": "*" };
  if (format === "json") return NextResponse.json({ table, columns, rows }, { headers: cache });
  const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  if (format === "md") {
    const md = [`| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${columns.map((c) => String(r[c] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
    return new NextResponse(md, { headers: { ...cache, "content-type": "text/markdown; charset=utf-8" } });
  }
  const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
  return new NextResponse(csv, { headers: { ...cache, "content-type": "text/csv; charset=utf-8", "content-disposition": `inline; filename="hajduci-${table}${season ? "-" + season : ""}.csv"` } });
}
