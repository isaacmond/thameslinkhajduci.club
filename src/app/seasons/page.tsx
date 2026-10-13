import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getData } from "@/lib/data";
import { form, pointsProgression, ppg, seasonSeries, signed } from "@/lib/stats";
import { FormStrip, PageHeader, Panel, SectionTitle, StatStrip, Tag } from "@/components/ui";
import { GoalsBySeason, WDLBySeason } from "@/components/charts";
import { PointsRaceChart } from "@/components/charts-race";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";

/** The big round mark beside each season (its number) and the friendlies (F). */
const mark = "display flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl leading-none";

export const metadata: Metadata = { title: "Seasons", description: "Every Thameslink Hajduci season: results, venues and top scorers." };

export default async function SeasonsPage() {
  const data = await getData();
  const series = seasonSeries(data);
  const seasons = [...data.seasons].reverse();
  const progression = pointsProgression(data);
  const raceSeason = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1] ?? null;
  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="History" title="Seasons" sub={`${data.seasons.length} league seasons across ${new Set(data.seasons.map((s) => s.venue)).size} venues.`} />
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel as="div" title="Results" sub="Won, drawn and lost"><WDLBySeason data={series} /></Panel>
        <Panel as="div" title="Goals" sub="Scored and conceded a game"><GoalsBySeason data={series} /></Panel>
        {progression.length > 0 && (
          <Panel as="div" title="Points" sub={raceSeason ? `Season ${raceSeason.number} highlighted against the rest` : "Cumulative points"}><PointsRaceChart series={progression} current={raceSeason?.id ?? null} /></Panel>
        )}
      </section>
      <ol className="stagger space-y-4">
        {seasons.map((s) => {
          const gd = s.summary.goalsFor - s.summary.goalsAgainst;
          return (
            <li key={s.id}>
              {/* Fixed columns at lg, so the figures sit in the same place on every card whatever the season's name or pace. */}
              <article className="card card-pad card-link group relative grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)_21rem_9rem] lg:items-center">
                <div className="flex items-center gap-4">
                  <span className={clsx(mark, s.isCurrent ? "bg-accent text-paper" : "bg-sunken text-ink")}>{s.number}</span>
                  <div className="min-w-0"><SectionTitle size="sm" bare sub={<span className="nowrap">{s.period}</span>}><Link href={`/seasons/${s.id.toLowerCase()}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">Season {s.number}</Link></SectionTitle>{s.isCurrent && <Tag tone="accent" className="mt-1.5">In progress</Tag>}</div>
                </div>
                <div>
                  <p className="text-sm text-ink">{s.venue}</p>
                  <p className="mt-1 text-xs text-muted">{s.summary.topScorer ? <>Top scorer <span className="text-ink">{s.summary.topScorer}</span></> : "No goals yet"}</p>
                  {s.summary.mostApps && <p className="mt-0.5 text-xs text-muted">Most appearances <span className="text-ink">{s.summary.mostApps}</span></p>}
                  <div className="relative z-10 mt-2 w-fit"><FormStrip matches={form(s.matches, 8)} size="sm" /></div>
                </div>
                <StatStrip size="sm" className="-my-2.5" items={([["P", s.summary.played], ["W", s.summary.won], ["D", s.summary.drawn], ["L", s.summary.lost], ["F", s.summary.goalsFor], ["A", s.summary.goalsAgainst], ["GD", signed(gd)]] as [string, number | string][]).map(([label, value]) => ({ label, value }))} />
                <div className="flex items-center justify-between gap-2 lg:justify-end"><span className="tabular text-xs text-muted">{ppg(s.summary).toFixed(2)} points a game</span><ArrowRight size={20} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" aria-hidden /></div>
              </article>
            </li>
          );
        })}
      </ol>
      {data.friendlies && (
        <article className="card card-pad mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={clsx(mark, "bg-sunken text-ink")}>F</span>
            <div className="min-w-0"><SectionTitle size="sm" bare sub={`${data.friendlies.matches.length} match${data.friendlies.matches.length === 1 ? "" : "es"} outside the league`}><Link href="/seasons/friendlies" className="focus-ring rounded hover:text-accent">Friendlies</Link></SectionTitle></div>
          </div>
          <div className="flex items-center gap-3"><FormStrip matches={[...data.friendlies.matches].filter((m) => m.played).slice(-8)} size="sm" /><Link href="/seasons/friendlies" className={btn("secondary", "xs")}>View <ArrowRight size={14} aria-hidden /></Link></div>
        </article>
      )}
    </div>
    </PageTransition>
  );
}
