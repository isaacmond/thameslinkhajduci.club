"use client";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import clsx from "clsx";
import { Select } from "./controls";
import { btn } from "./button";

type Preview = { table: string; columns: string[]; rows: Record<string, string | number | boolean | null>[] };

export function DataExplorer({ tables, seasons, initialPreview }: { tables: { name: string; info: string }[]; seasons: string[]; initialPreview?: Preview }) {
  const [table, setTable] = useState(tables[0]?.name ?? "players");
  const [season, setSeason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(initialPreview ?? null);
  const [loading, setLoading] = useState(!initialPreview);
  const [skipFirst, setSkipFirst] = useState(Boolean(initialPreview));
  const seasonable = !["seasons", "money", "payments", "opponents"].includes(table) || table === "opponents";
  const qs = useMemo(() => `table=${table}${season && seasonable ? `&season=${season}` : ""}`, [table, season, seasonable]);
  const url = (format: string) => `/api/export?${qs}&format=${format}`;

  const jsonUrl = `/api/export?${qs}&format=json`;
  useEffect(() => {
    if (skipFirst) { return; }
    let alive = true;
    fetch(jsonUrl).then((r) => r.json()).then((j: Preview) => { if (alive) setPreview(j); }).catch(() => { if (alive) setPreview(null); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonUrl]);
  const pick = (fn: () => void) => { setSkipFirst(false); setLoading(true); fn(); };

  const info = tables.find((t) => t.name === table)?.info;

  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink/10 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Select label="Table" value={table} onChange={(v) => pick(() => setTable(v))} options={tables.map((t) => ({ value: t.name, label: t.name }))} className="min-w-[10rem]" />
        <Select label="Season" value={season} onChange={(v) => pick(() => setSeason(v))} disabled={!seasonable} options={[{ value: "", label: "All-time" }, ...seasons.map((s) => ({ value: s, label: s }))]} className="min-w-[8rem]" />
        <p className="flex-1 text-xs text-muted sm:flex sm:h-[2.375rem] sm:items-center">{info}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-ink/10 bg-ink/[0.02] p-3 text-sm">
        <a href={url("csv")} download className={btn("primary", "xs")}><Download size={15} aria-hidden />Download this table</a>
        <a href="/api/export?format=xlsx" className={btn("secondary", "xs", "font-medium")}><Download size={15} aria-hidden />Every table as a spreadsheet</a>
      </div>
      <div className="scroll-x max-h-[520px] overflow-auto">
        {loading && !preview && <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>}
        {preview && (
          <table className="stats text-sm">
            <thead><tr>{preview.columns.map((c) => <th key={c} className={clsx(typeof preview.rows[0]?.[c] === "number" && "num")}>{c}</th>)}</tr></thead>
            <tbody>
              {preview.rows.slice(0, 200).map((r, i) => (
                <tr key={i}>{preview.columns.map((c) => <td key={c} className={clsx(typeof r[c] === "number" && "num", "max-w-[28ch] truncate")} title={String(r[c] ?? "")}>{r[c] === null || r[c] === undefined ? <span className="text-muted/50">–</span> : typeof r[c] === "boolean" ? (r[c] ? "yes" : "no") : String(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {preview && <p className="border-t border-ink/10 px-4 py-2 text-xs text-muted">{preview.rows.length} row{preview.rows.length === 1 ? "" : "s"}{preview.rows.length > 200 && " (showing first 200; the download has them all)"} · {preview.columns.length} columns</p>}
    </div>
  );
}
