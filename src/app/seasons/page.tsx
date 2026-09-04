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

export const metadata: Metadata = { title: "Seasons", description: "Season by season history of Thameslink Hajduci: venues, records, top scorers." };

export default async function SeasonsPage() {
  const data = await getData();
  const series = seasonSeries(data);
  const seasons = [...data.seasons].reverse();
  const progression = pointsProgression(data);
  const raceSeason = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1] ?? null;
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="History" title="Seasons" sub={`${data.seasons.length} seasons, ${new Set(data.seasons.map((s) => s.venue)).size} venues, one unwavering commitment to conceding first.`} />
      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5"><SectionTitle sub="Games that counted, per season">Results by season</SectionTitle><WDLBySeason data={series} /></div>
        <div className="card p-5"><SectionTitle sub="Average per game, scored and conceded">Goals by season</SectionTitle><GoalsBySeason data={series} /></div>
        {progression.length > 0 && (
          <div className="card p-5"><SectionTitle sub={raceSeason ? `Points after each game that counted. Season ${raceSeason.number}${raceSeason.isCurrent ? ", still running," : ""} in green; the rest in grey.` : "Points after each game that counted"}>Points race</SectionTitle><PointsRaceChart series={progression} current={raceSeason?.id ?? null} /></div>
        )}
      </section>
      <ol className="stagger space-y-4">
        {seasons.map((s) => {
          const gd = s.summary.goalsFor - s.summary.goalsAgainst;
          return (
            <li key={s.id}>
              <article className="card group relative grid gap-5 p-5 transition-colors hover:border-white/20 lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
                <div className="flex items-center gap-4 lg:w-52">
                  <span className={clsx("display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl", s.isCurrent ? "bg-mint text-night" : "bg-white/[0.06] text-cream")}>{s.id}</span>
                  <div><h2 className="display text-2xl leading-none text-cream"><Link href={`/seasons/${s.id.toLowerCase()}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">Season {s.number}</Link></h2><p className="nowrap text-xs text-ash">{s.period}</p>{s.isCurrent && <Tag tone="mint" className="mt-1">In progress</Tag>}</div>
                </div>
                <div>
                  <p className="text-sm text-cream">{s.venue}</p>
                  <p className="mt-1 text-xs text-ash">{s.summary.topScorer ? <span className="nowrap">Top scorer <span className="text-cream">{s.summary.topScorer}</span></span> : "No goals yet"}{s.summary.mostApps && <> · <span className="nowrap">Most apps <span className="text-cream">{s.summary.mostApps}</span></span></>}</p>
                  <div className="relative z-10 mt-2 w-fit"><FormStrip matches={form(s.matches, 8)} size="sm" /></div>
                </div>
                <dl className="grid grid-cols-4 gap-x-2 text-center sm:grid-cols-7 lg:w-[23rem]">
                  {([["P", s.summary.played, "text-cream"], ["W", s.summary.won, "text-mint-soft"], ["D", s.summary.drawn, "text-[#ffe27a]"], ["L", s.summary.lost, "text-[#ff9a9d]"], ["GF", s.summary.goalsFor, "text-cream"], ["GA", s.summary.goalsAgainst, "text-cream"], ["GD", signed(gd), gd >= 0 ? "text-mint-soft" : "text-[#ff9a9d]"]] as [string, number | string, string][]).map(([k, v, c]) => <div key={k}><dd className={clsx("display tabular text-2xl", c)}>{v}</dd><dt className="text-[10px] uppercase tracking-wider text-ash">{k}</dt></div>)}
                </dl>
                <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end"><span className="text-xs text-ash">{ppg(s.summary).toFixed(2)} pts/game</span><ArrowRight className="text-ash transition-transform group-hover:translate-x-1 group-hover:text-cream" aria-hidden /></div>
              </article>
            </li>
          );
        })}
      </ol>
      {data.friendlies && (
        <article className="card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl text-cream">FR</span>
            <div>
              <h2 className="display text-2xl leading-none text-cream"><Link href="/seasons/friendlies" className="focus-ring rounded hover:text-mint-soft">Friendlies</Link></h2>
              <p className="mt-1 text-xs text-ash">{data.friendlies.matches.length} game{data.friendlies.matches.length === 1 ? "" : "s"} outside the league. Bragging rights only: nothing here counts towards records.</p>
            </div>
          </div>
          <div className="flex items-center gap-3"><FormStrip matches={[...data.friendlies.matches].filter((m) => m.played).slice(-8)} size="sm" /><Link href="/seasons/friendlies" className="focus-ring chip text-ash hover:text-cream">View <ArrowRight size={14} aria-hidden /></Link></div>
        </article>
      )}
    </>
    </PageTransition>
  );
}
