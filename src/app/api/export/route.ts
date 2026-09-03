import { NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { buildTable, TABLES, type TableName } from "@/lib/tables";

/**
 * Tabular export. /api/export?table=players&format=csv|json|md&season=S7
 * Tables: players, matches, seasons, appearances, goals, opponents, money, payments
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const table = (url.searchParams.get("table") ?? "players") as TableName;
  const format = url.searchParams.get("format") ?? "csv";
  const season = url.searchParams.get("season") ?? undefined;
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
