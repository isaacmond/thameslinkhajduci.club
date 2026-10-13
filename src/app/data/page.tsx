import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CircleAlert, CircleCheck, Database, Download, ExternalLink, Info, Table2, TriangleAlert } from "lucide-react";
import { getData } from "@/lib/data";
import { SITE_URL } from "@/lib/config";
import { buildTable, TABLES, TABLE_INFO } from "@/lib/tables";
import { SEVERITY_LABEL, sheetHealth, type Severity } from "@/lib/health";
import { Callout, PageHeader, SectionTitle, Tag } from "@/components/ui";
import { DataExplorer } from "@/components/data-explorer";
import { RefreshButton } from "@/components/refresh-button";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Data & API", description: "Export Thameslink Hajduci stats as CSV, JSON, Markdown or a full spreadsheet, or pull a table straight into a sheet of your own." };

const SEVERITIES: Severity[] = ["high", "medium", "low"];
const SEVERITY_UI: Record<Severity, { tone: "loss" | "gold" | "default"; icon: React.ReactNode; blurb: string }> = {
  high: { tone: "loss", icon: <TriangleAlert size={16} className="text-loss" aria-hidden />, blurb: "A number on the site is wrong until these are fixed." },
  medium: { tone: "gold", icon: <CircleAlert size={16} className="text-gold" aria-hidden />, blurb: "Missing or ignored: the site copes, but quietly." },
  low: { tone: "default", icon: <Info size={16} className="text-muted" aria-hidden />, blurb: "Tidy-ups. Nothing is counted wrongly." },
};

export default async function DataPage() {
  const data = await getData();
  const health = sheetHealth(data);
  const readAt = new Date(data.fetchedAt).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Open data" title="Data" sub="Everything on this site, as tables you can download or connect to a spreadsheet." right={<RefreshButton />} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card min-w-0 p-5"><p className="eyebrow">Source of truth</p><p className="display mt-1 text-2xl leading-none text-ink">The records database</p><a href="/api/export?format=xlsx" className="link mt-1 inline-flex items-center gap-1 text-sm"><Download size={14} aria-hidden />Download it all as a spreadsheet</a></div>
        <div className="card min-w-0 p-5"><p className="eyebrow">Last read</p><p className="display mt-1 text-2xl leading-none text-ink">{readAt}</p><p className="mt-1 text-xs text-muted">Refreshed every minute</p></div>
        <div className="card min-w-0 p-5"><p className="eyebrow">In the dataset</p><p className="display mt-1 text-2xl leading-none text-ink">{data.matches.length} fixtures · {data.players.length} players</p><p className="mt-1 text-xs text-muted">{data.matches.filter((m) => m.played).length} played, {data.allTime.goalsFor + data.allTime.goalsAgainst} goals</p></div>
      </section>

      <section className="min-w-0" aria-labelledby="records-health">
        <SectionTitle id="records-health" sub={`Checked against the records on the last read: scorers v goals, assists, MOTM, appearance marks, overdue scores, dates, Money names. ${health.issues.length ? `${health.issues.length} thing${health.issues.length === 1 ? "" : "s"} to look at.` : "Nothing to report."}`} right={<div className="flex flex-wrap gap-2">{SEVERITIES.map((s) => <Tag key={s} tone={health.counts[s] ? SEVERITY_UI[s].tone : "default"}>{health.counts[s]} {SEVERITY_LABEL[s].toLowerCase()}</Tag>)}</div>}>Records health</SectionTitle>
        {health.issues.length === 0 ? (
          <Callout icon={<CircleCheck size={18} className="text-accent" />}>
            <span className="font-medium text-ink">All clear.</span> Scorers add up, every man of the match played, and every past fixture has a result.
          </Callout>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            {SEVERITIES.map((s) => {
              const list = health.issues.filter((i) => i.severity === s);
              return (
                <div key={s} className="card min-w-0 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 font-semibold text-ink">{SEVERITY_UI[s].icon}{SEVERITY_LABEL[s]}</p>
                    <Tag tone={list.length ? SEVERITY_UI[s].tone : "default"}>{list.length}</Tag>
                  </div>
                  <p className="mt-1 text-xs text-muted">{SEVERITY_UI[s].blurb}</p>
                  {list.length ? (
                    <ul className="mt-3 divide-y divide-ink/5">
                      {list.map((i) => (
                        <li key={i.key} className="py-2 text-sm text-muted [overflow-wrap:anywhere]">
                          {i.message}
                          {i.href && <Link href={i.href} className="link ml-1 inline-flex items-center gap-0.5 whitespace-nowrap text-xs">Open <ArrowUpRight size={12} aria-hidden /></Link>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted/70">None</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="min-w-0">
        <SectionTitle sub="Choose a table and a season, then download it or copy a Google Sheets formula">Tables</SectionTitle>
        <DataExplorer tables={TABLES.map((t) => ({ name: t, info: TABLE_INFO[t] }))} seasons={[...data.seasons].reverse().map((s) => s.id)} siteUrl={SITE_URL} initialPreview={{ table: "players", ...buildTable(data, "players") }} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card min-w-0 p-5">
          <SectionTitle><span className="inline-flex items-center gap-2"><Table2 size={20} className="text-accent" aria-hidden />Tabular export</span></SectionTitle>
          <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg bg-sunken p-4 text-xs text-ink/90 lg:overflow-x-auto lg:whitespace-pre"><code>{`GET /api/export?table=<name>&format=csv|json|md[&season=S7]\nGET /api/export?format=xlsx   # every table, one workbook\n\ntables: ${TABLES.join(", ")}\n\n# examples\n${SITE_URL}/api/export?table=players&format=csv\n${SITE_URL}/api/export?table=goals&season=S7&format=json\n${SITE_URL}/api/export?table=opponents&format=md`}</code></pre>
          <ul className="mt-4 space-y-1 text-sm text-muted">{TABLES.map((t) => <li key={t}><a href={`/api/export?table=${t}&format=json`} target="_blank" rel="noopener" className="link font-mono text-xs">{t}</a> <span>· {TABLE_INFO[t]}</span></li>)}</ul>
        </div>
        <div className="min-w-0 space-y-6">
          <div className="card min-w-0 p-5">
            <SectionTitle><span className="inline-flex items-center gap-2"><Database size={20} className="text-accent" aria-hidden />Full dataset</span></SectionTitle>
            <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg bg-sunken p-4 text-xs text-ink/90 lg:overflow-x-auto lg:whitespace-pre"><code>{`GET /api/data           # everything, nested JSON\nGET /api/data?pretty=1  # same, indented for humans\nPOST /api/revalidate    # force a fresh read of the records`}</code></pre>
            <p className="mt-3 text-sm text-muted">The JSON has <code className="text-ink">seasons[].matches[].lineup[]</code>, <code className="text-ink">players[].seasons[]</code> and <code className="text-ink">money</code>, matching what the site shows. CORS is open and responses are cached for a minute.</p>
            <a href="/api/data?pretty=1" target="_blank" rel="noopener" className="link mt-3 inline-flex items-center gap-1 text-sm">Open /api/data <ExternalLink size={14} aria-hidden /></a>
          </div>
          <Callout>Results, payments and new players are added through <Link href="/submit" className="link">Add a result</Link>. Signed-in members are recorded straight away; everyone else is approved by the admin.</Callout>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
