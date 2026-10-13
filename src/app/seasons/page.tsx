import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getData } from "@/lib/data";
import { form, pointsProgression, ppg, seasonSeries, signed } from "@/lib/stats";
import { FormStrip, PageHeader, SectionTitle, Tag } from "@/components/ui";
import { GoalsBySeason, WDLBySeason } from "@/components/charts";
import { PointsRaceChart } from "@/components/charts-race";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Seasons", description: "Every Thameslink Hajduci season: results, venues and top scorers." };

export default async function SeasonsPage() {
  const data = await getData();
  const series = seasonSeries(data);
  const seasons = [...data.seasons].reverse();
  const progression = pointsProgression(data);
  const raceSeason = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1] ?? null;
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="History" title="Seasons" sub={`${data.seasons.length} league seasons across ${new Set(data.seasons.map((s) => s.venue)).size} venues.`} />
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6"><SectionTitle sub="Wins, draws and defeats">Results</SectionTitle><WDLBySeason data={series} /></div>
        <div className="card p-6"><SectionTitle sub="Scored and conceded per game">Goals</SectionTitle><GoalsBySeason data={series} /></div>
        {progression.length > 0 && (
          <div className="card p-6"><SectionTitle sub={raceSeason ? `Season ${raceSeason.number} highlighted against the rest` : "Cumulative points"}>Points</SectionTitle><PointsRaceChart series={progression} current={raceSeason?.id ?? null} /></div>
        )}
      </section>
      <ol className="stagger space-y-4">
        {seasons.map((s) => {
          const gd = s.summary.goalsFor - s.summary.goalsAgainst;
          return (
            <li key={s.id}>
              <article className="card group relative grid gap-5 p-6 transition-shadow hover:shadow-lg lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
                <div className="flex items-center gap-4 lg:w-52">
                  <span className={clsx("display flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl leading-none", s.isCurrent ? "bg-accent text-paper" : "bg-sunken text-ink")}>{s.number}</span>
                  <div><h2 className="display text-2xl leading-none text-ink"><Link href={`/seasons/${s.id.toLowerCase()}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">Season {s.number}</Link></h2><p className="nowrap text-xs text-muted">{s.period}</p>{s.isCurrent && <Tag tone="mint" className="mt-1">In progress</Tag>}</div>
                </div>
                <div>
                  <p className="text-sm text-ink">{s.venue}</p>
                  <p className="mt-1 text-xs text-muted">{s.summary.topScorer ? <span className="nowrap">Top scorer <span className="text-ink">{s.summary.topScorer}</span></span> : "No goals yet"}{s.summary.mostApps && <> · <span className="nowrap">Most appearances <span className="text-ink">{s.summary.mostApps}</span></span></>}</p>
                  <div className="relative z-10 mt-2 w-fit"><FormStrip matches={form(s.matches, 8)} size="sm" /></div>
                </div>
                <dl className="grid grid-cols-4 gap-x-2 text-center sm:grid-cols-7 lg:w-[23rem]">
                  {([["P", s.summary.played], ["W", s.summary.won], ["D", s.summary.drawn], ["L", s.summary.lost], ["F", s.summary.goalsFor], ["A", s.summary.goalsAgainst], ["GD", signed(gd)]] as [string, number | string][]).map(([k, v]) => <div key={k}><dd className="display tabular text-2xl text-ink">{v}</dd><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{k}</dt></div>)}
                </dl>
                <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end"><span className="text-xs text-muted">{ppg(s.summary).toFixed(2)} points a game</span><ArrowRight className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" aria-hidden /></div>
              </article>
            </li>
          );
        })}
      </ol>
      {data.friendlies && (
        <article className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="display flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sunken text-2xl italic leading-none text-ink">F</span>
            <div>
              <h2 className="display text-2xl leading-none text-ink"><Link href="/seasons/friendlies" className="focus-ring rounded hover:text-accent">Friendlies</Link></h2>
              <p className="mt-1 text-xs text-muted">{data.friendlies.matches.length} game{data.friendlies.matches.length === 1 ? "" : "s"} outside the league</p>
            </div>
          </div>
          <div className="flex items-center gap-3"><FormStrip matches={[...data.friendlies.matches].filter((m) => m.played).slice(-8)} size="sm" /><Link href="/seasons/friendlies" className="focus-ring chip text-muted hover:text-ink">View <ArrowRight size={14} aria-hidden /></Link></div>
        </article>
      )}
    </>
    </PageTransition>
  );
}
