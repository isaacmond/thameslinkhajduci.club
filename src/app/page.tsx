import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, form, gwLabel, lastResult, leaderboard, type MilestoneKind, nextFixture, recentPlayers, records, scoreline, seasonHref, seasonPlayers, upcomingMilestones } from "@/lib/stats";
import { insights, pickInsights } from "@/lib/insights";
import { londonEpoch, londonToday } from "@/lib/time";
import { Avatar, Crest, FormStrip, LeaderList, MatchRow, PlayerLink, RecordStrip, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import { Countdown } from "@/components/countdown";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";
import { Sponsors } from "@/components/footer";

const KIND: Record<MilestoneKind, [string, string]> = { apps: ["appearance", "appearances"], goals: ["goal", "goals"], assists: ["assist", "assists"], motm: ["man of the match award", "man of the match awards"] };
const KIND_LABEL: Record<MilestoneKind, string> = { apps: "Appearances", goals: "Goals", assists: "Assists", motm: "Man of the match" };

export default async function Home() {
  const data = await getData();
  const current = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1];
  const next = nextFixture(data), last = lastResult(data);
  const rec = records(data);
  const topScorers = leaderboard(data.players, "goals").slice(0, 3), topApps = leaderboard(data.players, "apps").slice(0, 3);
  const sp = current ? seasonPlayers(data, current.id) : [];
  const sScorers = leaderboard(sp, "goals").slice(0, 3), sApps = leaderboard(sp, "apps").slice(0, 3);
  const today = londonToday();
  const upcoming = current ? chronological(current.matches).filter((m) => !m.played && m.date && m.date >= today && m.id !== next?.id).slice(0, 4) : [];
  const recent = form(data.matches, 8);
  const talking = pickInsights(insights(data), 4);
  const milestones = upcomingMilestones(recentPlayers(data), 3).slice(0, 4);
  const since = fmtDate(data.matches.find((m) => m.date)?.date ?? null, { month: "long", year: "numeric" });
  const lastScorers = last ? last.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals) : [];
  const readAt = new Date(data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const kickoff = next?.date ? londonEpoch(next.date, next.kickOff ?? "19:00") : null;

  return (
    <PageTransition>
    <div className="space-y-14 sm:space-y-20">
      <section className="grid items-center gap-8 pt-2 animate-rise lg:grid-cols-[1fr_auto] lg:gap-16">
        <div>
          <p className="eyebrow mb-4 flex flex-wrap items-center gap-2">
            {current && <span>Season {current.number} · {current.period}</span>}
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />Updated {readAt}</span>
            {data.stale && <Tag tone="gold">Showing the last saved copy</Tag>}
          </p>
          <div className="flex items-center gap-5">
            <Crest size={88} className="h-20 w-20 shrink-0 lg:hidden" />
            <h1 className="display text-[3.4rem] leading-[0.92] text-ink sm:text-7xl lg:text-[6.5rem]">Thameslink<br />Hajduci</h1>
          </div>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">A six-a-side football club from East London. Every match, goal and appearance since {since}, kept by the players.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/squad" className={btn("primary", "md")}>Meet the squad</Link>
            <Link href="/matches" className={btn("secondary", "md")}>Fixtures and results</Link>
          </div>
        </div>
        <Crest size={260} className="hidden lg:block" />
      </section>

      {(next || last) && (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Next match and latest result">
          {next && (
            <Link href={`/matches/${next.id}`} className="focus-ring card group flex flex-col p-6 transition-shadow hover:shadow-lg sm:p-7">
              <p className="eyebrow">Next match</p>
              <div className="mt-5 flex items-center gap-4">
                <TeamBadge name={next.opponent} size={52} />
                <div className="min-w-0">
                  <p className="display truncate text-[2rem] leading-tight text-ink">{next.opponent}</p>
                  <p className="text-sm text-muted">{fmtDate(next.date, { weekday: "long", day: "numeric", month: "long" })}{next.kickOff && ` · ${next.kickOff}`}</p>
                </div>
              </div>
              <span className="min-h-6 flex-1" aria-hidden />
              <div className="flex items-end justify-between gap-4 border-t border-ink/10 pt-5">
                <div>
                  <p className="eyebrow !text-[10px]">Kick-off in</p>
                  {kickoff !== null ? <Countdown target={kickoff} className="display mt-1 text-3xl text-ink" /> : <p className="display mt-1 text-3xl text-ink">TBC</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">Match details <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
              </div>
            </Link>
          )}
          {last && (
            <Link href={`/matches/${last.id}`} className="focus-ring card group flex flex-col p-6 transition-shadow hover:shadow-lg sm:p-7">
              <p className="eyebrow flex items-center justify-between gap-2"><span>Latest result</span><span className="font-medium normal-case tracking-normal">{fmtDate(last.date, { weekday: "short", day: "numeric", month: "short" })}</span></p>
              <div className="mt-5 flex items-center gap-4">
                <ResultPill result={last.result} size="lg" />
                <div className="min-w-0">
                  <p className="display text-[2rem] leading-tight text-ink"><span className="tabular">{scoreline(last)}</span> <span className="text-muted">v</span> {last.opponent}</p>
                  <p className="text-sm text-muted">{last.seasonId === "FR" ? "Friendly" : `Season ${last.seasonNumber} · ${gwLabel(last)}`}</p>
                </div>
              </div>
              <span className="min-h-6 flex-1" aria-hidden />
              <div className="space-y-1 border-t border-ink/10 pt-5 text-sm">
                {lastScorers.length > 0 && <p className="text-muted"><span className="text-ink">Goals</span> · {lastScorers.map((s) => `${s.player}${s.goals > 1 ? ` ${s.goals}` : ""}`).join(", ")}</p>}
                {last.motm && <p className="flex items-center gap-1.5 text-muted"><Star size={13} className="fill-gold text-gold" aria-hidden /><span className="text-ink">Man of the match</span> · {last.motm}</p>}
                {!lastScorers.length && !last.motm && <p className="text-muted">Match report and line-up</p>}
              </div>
            </Link>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {current && (
          <article className="card overflow-hidden">
            <header className="flex items-baseline justify-between gap-3 px-6 pb-1 pt-6">
              <h2 className="display text-[1.75rem] leading-none text-ink">Season {current.number}</h2>
              <Link href={seasonHref(current.id)} className="focus-ring inline-flex items-center gap-1 rounded text-sm font-medium text-accent hover:underline">{current.period} <ArrowRight size={14} aria-hidden /></Link>
            </header>
            <RecordStrip s={current.summary} animate />
            <div className="grid grid-cols-1 gap-6 border-t border-ink/10 p-6 sm:grid-cols-2">
              <div><p className="eyebrow mb-3">Appearances</p><LeaderList items={sApps} color="bg-ink" emptyText="The season hasn't started yet" /></div>
              <div><p className="eyebrow mb-3">Goals</p><LeaderList items={sScorers} emptyText="No goals yet this season" /></div>
            </div>
          </article>
        )}
        <article className="card overflow-hidden">
          <header className="flex items-baseline justify-between gap-3 px-6 pb-1 pt-6">
            <h2 className="display text-[1.75rem] leading-none text-ink">All time</h2>
            <span className="text-sm text-muted">{data.seasons.length} seasons since {since}</span>
          </header>
          <RecordStrip s={data.allTime} animate />
          <div className="grid grid-cols-1 gap-6 border-t border-ink/10 p-6 sm:grid-cols-2">
            <div><p className="eyebrow mb-3">Most appearances</p><LeaderList items={topApps} color="bg-ink" /></div>
            <div><p className="eyebrow mb-3">Top scorers</p><LeaderList items={topScorers} /></div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="card p-6">
          <SectionTitle sub="The last eight league matches">Form</SectionTitle>
          <FormStrip matches={[...recent].reverse()} />
          <ul className="mt-5 divide-y divide-ink/8 text-sm">
            {[...recent].reverse().slice(0, 4).map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="group flex items-center gap-3 py-2.5"><ResultPill result={m.result} size="sm" /><span className="min-w-0 truncate text-ink group-hover:text-accent"><span className="tabular font-medium">{scoreline(m)}</span> v {m.opponent}</span><span className="ml-auto shrink-0 text-xs text-muted">{fmtDate(m.date, { day: "numeric", month: "short" })}</span></Link></li>)}
          </ul>
        </div>
        <div className="card p-6">
          <SectionTitle right={<Link href="/matches" className="link text-sm">All fixtures</Link>} sub={current?.venue}>Coming up</SectionTitle>
          {upcoming.length ? <div className="-mx-3 grid grid-cols-1 gap-0.5">{upcoming.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div> : <p className="text-sm text-muted">{next ? "That's the last fixture on the calendar for now." : "No fixtures scheduled yet."}</p>}
        </div>
      </section>

      {(talking.length > 0 || milestones.length > 0) && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {talking.length > 0 && (
            <div className="card p-6">
              <SectionTitle right={<Link href="/stats" className="link text-sm">Statistics</Link>}>In numbers</SectionTitle>
              <ul className="divide-y divide-ink/8">
                {talking.map((t) => (
                  <li key={t.key}>
                    <Link href={t.href ?? "/stats"} className="focus-ring group flex items-start gap-3 rounded py-3 text-[15px] leading-snug">
                      <span className="min-w-0 flex-1 text-ink group-hover:text-accent">{t.text}</span>
                      <ArrowRight size={15} className="mt-1 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {milestones.length > 0 && (
            <div className="card p-6">
              <SectionTitle sub="Within reach of a round number">Milestones</SectionTitle>
              <ul className="space-y-3">
                {milestones.map((ms) => (
                  <li key={`${ms.player.slug}-${ms.kind}`} className="flex items-center gap-3">
                    <Avatar name={ms.player.name} photo={ms.player.extra.photo} size={38} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <PlayerLink name={ms.player.name} player={ms.player} className="block truncate text-sm" />
                      <span className="block text-xs text-muted">{ms.away} {KIND[ms.kind][ms.away === 1 ? 0 : 1]} to go</span>
                    </span>
                    <span className="shrink-0 text-right leading-none">
                      <span className="display tabular block text-3xl leading-none text-ink">{ms.target}</span>
                      <span className="eyebrow !text-[9px] !tracking-[0.1em]">{KIND_LABEL[ms.kind]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <SectionTitle right={<Link href="/records" className="link text-sm">All records</Link>}>Records</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
          {rec.biggestWin && <Link href={`/matches/${rec.biggestWin.id}`} className="focus-ring card group p-6 transition-shadow hover:shadow-lg"><p className="eyebrow">Biggest win</p><p className="display tabular mt-3 text-5xl leading-none text-ink">{scoreline(rec.biggestWin)}</p><p className="mt-2 text-sm text-muted">v {rec.biggestWin.opponent} · {fmtDate(rec.biggestWin.date)}</p></Link>}
          {rec.heaviestDefeat && <Link href={`/matches/${rec.heaviestDefeat.id}`} className="focus-ring card group p-6 transition-shadow hover:shadow-lg"><p className="eyebrow">Heaviest defeat</p><p className="display tabular mt-3 text-5xl leading-none text-ink">{scoreline(rec.heaviestDefeat)}</p><p className="mt-2 text-sm text-muted">v {rec.heaviestDefeat.opponent} · {fmtDate(rec.heaviestDefeat.date)}</p></Link>}
          {rec.longestUnbeaten && <Link href="/records" className="focus-ring card group p-6 transition-shadow hover:shadow-lg"><p className="eyebrow">Longest unbeaten run</p><p className="display tabular mt-3 text-5xl leading-none text-ink">{rec.longestUnbeaten.length} <span className="text-3xl text-muted">matches</span></p><p className="mt-2 text-sm text-muted">{fmtDate(rec.longestUnbeaten.start.date, { month: "short", year: "numeric" })} to {fmtDate(rec.longestUnbeaten.end.date, { month: "short", year: "numeric" })}</p></Link>}
        </div>
      </section>

      <Sponsors />
    </div>
    </PageTransition>
  );
}
