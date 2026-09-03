import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getData } from "@/lib/data";
import { form, ppg, seasonSeries, signed } from "@/lib/stats";
import { FormStrip, PageHeader, SectionTitle, Tag } from "@/components/ui";
import { GoalsBySeason, WDLBySeason } from "@/components/charts";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Seasons", description: "Season by season history of Thameslink Hajduci: venues, records, top scorers." };

export default async function SeasonsPage() {
  const data = await getData();
  const series = seasonSeries(data);
  const seasons = [...data.seasons].reverse();
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="History" title="Seasons" sub={`${data.seasons.length} seasons, ${new Set(data.seasons.map((s) => s.venue)).size} venues, one unwavering commitment to conceding first.`} />
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5"><SectionTitle sub="Games that counted, per season">Results by season</SectionTitle><WDLBySeason data={series} /></div>
        <div className="card p-5"><SectionTitle sub="Average per game, scored and conceded">Goals by season</SectionTitle><GoalsBySeason data={series} /></div>
      </section>
      <ol className="stagger space-y-4">
        {seasons.map((s) => {
          const gd = s.summary.goalsFor - s.summary.goalsAgainst;
          return (
            <li key={s.id}>
              <article className="card group relative grid gap-5 p-5 transition-colors hover:border-white/20 lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
                <div className="flex items-center gap-4 lg:w-44">
                  <span className={clsx("display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl", s.isCurrent ? "bg-mint text-night" : "bg-white/[0.06] text-cream")}>{s.id}</span>
                  <div><h2 className="display text-2xl leading-none text-cream"><Link href={`/seasons/${s.id.toLowerCase()}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">Season {s.number}</Link></h2><p className="text-xs text-ash">{s.period}</p>{s.isCurrent && <Tag tone="mint" className="mt-1">In progress</Tag>}</div>
                </div>
                <div>
                  <p className="text-sm text-cream">{s.venue}</p>
                  <p className="mt-1 text-xs text-ash">{s.summary.topScorer ? <>Top scorer <span className="text-cream">{s.summary.topScorer}</span></> : "No goals yet"}{s.summary.mostApps && <> · Most apps <span className="text-cream">{s.summary.mostApps}</span></>}</p>
                  <div className="relative z-10 mt-2 w-fit"><FormStrip matches={form(s.matches, 8)} size="sm" /></div>
                </div>
                <dl className="grid grid-cols-4 gap-x-4 text-center sm:grid-cols-7">
                  {([["P", s.summary.played, "text-cream"], ["W", s.summary.won, "text-mint-soft"], ["D", s.summary.drawn, "text-[#ffe27a]"], ["L", s.summary.lost, "text-[#ff9a9d]"], ["GF", s.summary.goalsFor, "text-cream"], ["GA", s.summary.goalsAgainst, "text-cream"], ["GD", signed(gd), gd >= 0 ? "text-mint-soft" : "text-[#ff9a9d]"]] as [string, number | string, string][]).map(([k, v, c]) => <div key={k}><dd className={clsx("display tabular text-2xl", c)}>{v}</dd><dt className="text-[10px] uppercase tracking-wider text-ash">{k}</dt></div>)}
                </dl>
                <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end"><span className="text-xs text-ash">{ppg(s.summary).toFixed(2)} pts/game</span><ArrowRight className="text-ash transition-transform group-hover:translate-x-1 group-hover:text-cream" aria-hidden /></div>
              </article>
            </li>
          );
        })}
      </ol>
    </>
    </PageTransition>
  );
}
