"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { Select } from "./controls";

type Preview = { table: string; columns: string[]; rows: Record<string, string | number | boolean | null>[] };

export function DataExplorer({ tables, seasons, siteUrl, initialPreview }: { tables: { name: string; info: string }[]; seasons: string[]; siteUrl: string; initialPreview?: Preview }) {
  const [table, setTable] = useState(tables[0]?.name ?? "players");
  const [season, setSeason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(initialPreview ?? null);
  const [loading, setLoading] = useState(!initialPreview);
  const [skipFirst, setSkipFirst] = useState(Boolean(initialPreview));
  const [copied, setCopied] = useState<string | null>(null);
  const seasonable = !["seasons", "money", "payments", "opponents"].includes(table) || table === "opponents";
  const qs = useMemo(() => `table=${table}${season && seasonable ? `&season=${season}` : ""}`, [table, season, seasonable]);
  const url = (format: string) => `/api/export?${qs}&format=${format}`;
  const absolute = (format: string) => `${siteUrl}${url(format)}`;

  const jsonUrl = `/api/export?${qs}&format=json`;
  useEffect(() => {
    if (skipFirst) { return; }
    let alive = true;
    fetch(jsonUrl).then((r) => r.json()).then((j: Preview) => { if (alive) setPreview(j); }).catch(() => { if (alive) setPreview(null); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonUrl]);
  const pick = (fn: () => void) => { setSkipFirst(false); setLoading(true); fn(); };

  const copy = async (label: string, text: string | (() => Promise<string>)) => {
    try { const t = typeof text === "string" ? text : await text(); await navigator.clipboard.writeText(t); setCopied(label); setTimeout(() => setCopied(null), 2000); } catch { setCopied("failed"); setTimeout(() => setCopied(null), 2000); }
  };
  const info = tables.find((t) => t.name === table)?.info;

  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Select label="Table" value={table} onChange={(v) => pick(() => setTable(v))} options={tables.map((t) => ({ value: t.name, label: t.name }))} className="min-w-[10rem]" />
        <Select label="Season" value={season} onChange={(v) => pick(() => setSeason(v))} disabled={!seasonable} options={[{ value: "", label: "All-time" }, ...seasons.map((s) => ({ value: s, label: s }))]} className="min-w-[8rem]" />
        <p className="flex-1 text-xs text-ash sm:pb-2">{info}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/[0.02] p-3 text-sm">
        <a href={url("csv")} download className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-1.5 font-semibold text-night hover:bg-mint-soft"><Download size={15} aria-hidden />CSV</a>
        <a href={url("json")} target="_blank" rel="noopener" className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-cream hover:bg-white/10"><ExternalLink size={15} aria-hidden />JSON</a>
        <Btn onClick={() => copy("md", async () => (await fetch(url("md"))).text())} done={copied === "md"}>Copy Markdown</Btn>
        <Btn onClick={() => copy("sheets", `=IMPORTDATA("${absolute("csv")}")`)} done={copied === "sheets"}>Copy Google Sheets formula</Btn>
        <Btn onClick={() => copy("curl", `curl -s '${absolute("json")}' | jq .rows`)} done={copied === "curl"}>Copy curl</Btn>
        <Btn onClick={() => copy("url", absolute("csv"))} done={copied === "url"}>Copy URL</Btn>
        {copied === "failed" && <span className="self-center text-xs text-[#ff9a9d]">Clipboard blocked</span>}
      </div>
      <div className="scroll-x max-h-[520px] overflow-auto">
        {loading && !preview && <p className="px-4 py-8 text-center text-sm text-ash">Loading…</p>}
        {preview && (
          <table className="stats text-sm">
            <thead><tr>{preview.columns.map((c) => <th key={c} className={clsx(typeof preview.rows[0]?.[c] === "number" && "num")}>{c}</th>)}</tr></thead>
            <tbody>
              {preview.rows.slice(0, 200).map((r, i) => (
                <tr key={i}>{preview.columns.map((c) => <td key={c} className={clsx(typeof r[c] === "number" && "num", "max-w-[28ch] truncate")} title={String(r[c] ?? "")}>{r[c] === null || r[c] === undefined ? <span className="text-ash/50">–</span> : typeof r[c] === "boolean" ? (r[c] ? "yes" : "no") : String(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {preview && <p className="border-t border-white/10 px-4 py-2 text-xs text-ash">{preview.rows.length} row{preview.rows.length === 1 ? "" : "s"}{preview.rows.length > 200 && " (showing first 200; the download has them all)"} · {preview.columns.length} columns</p>}
    </div>
  );
}

function Btn({ onClick, done, children }: { onClick: () => void; done: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-cream hover:bg-white/10">{done ? <Check size={15} className="text-mint-soft" aria-hidden /> : <Copy size={15} aria-hidden />}{done ? "Copied" : children}</button>;
}
