import type { Metadata } from "next";
import { Database, ExternalLink, Table2 } from "lucide-react";
import { getData } from "@/lib/data";
import { REVALIDATE_SECONDS, SHEET_URL } from "@/lib/sheet";
import { SITE_URL } from "@/lib/config";
import { TABLES, TABLE_INFO } from "@/lib/tables";
import { Callout, PageHeader, SectionTitle } from "@/components/ui";
import { DataExplorer } from "@/components/data-explorer";
import { RefreshButton } from "@/components/refresh-button";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Data & API", description: "Export Thameslink Hajduci stats as CSV, JSON or Markdown, or pull them straight into Google Sheets." };

export default async function DataPage() {
  const data = await getData();
  const readAt = new Date(data.fetchedAt).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Extract everything" title="Data & API" sub="Every number on this site is read live from the club's Google Sheet and re-shaped into tidy tables. Nothing is stored here, nothing can be uploaded here. Take what you need." right={<RefreshButton />} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card min-w-0 p-5"><p className="eyebrow">Source of truth</p><a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-flex items-center gap-1 text-lg font-medium">The spreadsheet <ExternalLink size={14} aria-hidden /></a><p className="mt-1 text-xs text-ash">Season tabs S1–S{data.seasons.length}, Money, Payments</p></div>
        <div className="card min-w-0 p-5"><p className="eyebrow">Last read</p><p className="display mt-1 text-2xl text-cream">{readAt}</p><p className="mt-1 text-xs text-ash">Re-read at most every {REVALIDATE_SECONDS}s, or on demand with the button</p></div>
        <div className="card min-w-0 p-5"><p className="eyebrow">In the dataset</p><p className="display mt-1 text-2xl text-cream">{data.matches.length} fixtures · {data.players.length} players</p><p className="mt-1 text-xs text-ash">{data.matches.filter((m) => m.played).length} played, {data.allTime.goalsFor + data.allTime.goalsAgainst} goals witnessed</p></div>
      </section>

      <section className="min-w-0">
        <SectionTitle sub="Pick a table, optionally a season, then download or copy. The Google Sheets formula gives you a live-updating tab in your own spreadsheet.">Table explorer</SectionTitle>
        <DataExplorer tables={TABLES.map((t) => ({ name: t, info: TABLE_INFO[t] }))} seasons={[...data.seasons].reverse().map((s) => s.id)} siteUrl={SITE_URL} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card min-w-0 p-5">
          <SectionTitle><span className="inline-flex items-center gap-2"><Table2 size={20} className="text-mint-soft" aria-hidden />Tabular export</span></SectionTitle>
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-night/70 p-4 text-xs text-cream/90 sm:overflow-x-auto sm:whitespace-pre sm:break-normal"><code>{`GET /api/export?table=<name>&format=csv|json|md[&season=S7]\n\ntables: ${TABLES.join(", ")}\n\n# examples\n${SITE_URL}/api/export?table=players&format=csv\n${SITE_URL}/api/export?table=goals&season=S7&format=json\n${SITE_URL}/api/export?table=opponents&format=md`}</code></pre>
          <ul className="mt-4 space-y-1 text-sm text-ash">{TABLES.map((t) => <li key={t}><a href={`/api/export?table=${t}&format=json`} target="_blank" rel="noopener" className="link font-mono text-xs">{t}</a> <span>· {TABLE_INFO[t]}</span></li>)}</ul>
        </div>
        <div className="min-w-0 space-y-6">
          <div className="card min-w-0 p-5">
            <SectionTitle><span className="inline-flex items-center gap-2"><Database size={20} className="text-mint-soft" aria-hidden />Full dataset</span></SectionTitle>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-night/70 p-4 text-xs text-cream/90 sm:overflow-x-auto sm:whitespace-pre sm:break-normal"><code>{`GET /api/data           # everything, nested JSON\nGET /api/data?pretty=1  # same, indented for humans\nPOST /api/revalidate    # force a fresh read of the sheet`}</code></pre>
            <p className="mt-3 text-sm text-ash">The JSON has <code className="text-cream">seasons[].matches[].lineup[]</code>, <code className="text-cream">players[].seasons[]</code> and <code className="text-cream">money</code>, all with the same rules the site uses: friendlies and forfeits flagged with <code className="text-cream">countsForRecords: false</code>, and every match flagged with <code className="text-cream">scorersRecorded</code> / <code className="text-cream">assistsRecorded</code>. CORS is open, responses are cached for a minute.</p>
            <a href="/api/data?pretty=1" target="_blank" rel="noopener" className="link mt-3 inline-flex items-center gap-1 text-sm">Open /api/data <ExternalLink size={14} aria-hidden /></a>
          </div>
          <Callout>Want a new stat? Add it to the sheet, not the site. Anything in a season tab (a new row, a new gameweek, a new player) shows up here automatically. Photos, shirt numbers and positions can be overridden with a tab called <span className="text-cream">Squad</span> with columns <span className="text-cream">Player, Nickname, Position, Shirt, Photo, Bio</span>.</Callout>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
