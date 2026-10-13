import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, form, gwLabel, lastResult, leaderboard, type MilestoneKind, nextFixture, recentPlayers, records, scoreline, seasonHref, seasonPlayers, upcomingMilestones } from "@/lib/stats";
import { insights, pickInsights } from "@/lib/insights";
import { londonEpoch, londonToday } from "@/lib/time";
import { ArrowLink, Avatar, Crest, FormStrip, IconText, LeaderList, MatchRow, MotmStar, Panel, PlayerLink, RecordCard, RecordStrip, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import { Countdown } from "@/components/countdown";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";
import { Sponsors } from "@/components/footer";

const KIND: Record<MilestoneKind, [string, string]> = { apps: ["appearance", "appearances"], goals: ["goal", "goals"], assists: ["assist", "assists"], motm: ["man of the match award", "man of the match awards"] };
const KIND_LABEL: Record<MilestoneKind, string> = { apps: "Appearances", goals: "Goals", assists: "Assists", motm: "Man of the match" };

/** The next-match and latest-result cards share the row tracks of their section, so headlines and footer rules line up. */
const leadCard = "focus-ring card card-pad card-link group flex flex-col md:row-span-3 md:grid md:grid-rows-subgrid md:gap-0";

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
            {data.stale && <Tag>Showing the last saved copy</Tag>}
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
        <section className="grid gap-4 md:grid-cols-2 md:grid-rows-[auto_1fr_auto]" aria-label="Next match and latest result">
          {next && (
            <Link href={`/matches/${next.id}`} className={leadCard}>
              <p className="eyebrow">Next match</p>
              <div className="mt-5 flex items-center gap-4 md:self-start">
                <span className="flex w-13 shrink-0 justify-center"><TeamBadge name={next.opponent} size={52} /></span>
                <div className="min-w-0">
                  <p className="display truncate text-[2rem] leading-tight text-ink">{next.opponent}</p>
                  <p className="text-sm text-muted">{fmtDate(next.date, { weekday: "long", day: "numeric", month: "long" })}{next.kickOff && ` · ${next.kickOff}`}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-ink/10 pt-5">
                <div>
                  <p className="eyebrow">Kick-off in</p>
                  {kickoff !== null ? <Countdown target={kickoff} className="tabular mt-1 text-3xl font-semibold tracking-tight text-ink" /> : <p className="display mt-1 text-3xl text-ink">TBC</p>}
                </div>
                <ArrowLink>Match details</ArrowLink>
              </div>
            </Link>
          )}
          {last && (
            <Link href={`/matches/${last.id}`} className={leadCard}>
              <p className="eyebrow">Latest result</p>
              <div className="mt-5 flex items-center gap-4 md:self-start">
                <span className="flex w-13 shrink-0 justify-center"><ResultPill result={last.result} size="lg" /></span>
                <div className="min-w-0">
                  <p className="display text-[2rem] leading-tight text-ink"><span className="tabular">{scoreline(last)}</span> <span className="text-muted">v</span> {last.opponent}</p>
                  <p className="text-sm text-muted">{last.seasonId === "FR" ? "Friendly" : `Season ${last.seasonNumber} · ${gwLabel(last)}`} · {fmtDate(last.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                </div>
              </div>
              <div className="mt-6 space-y-1 border-t border-ink/10 pt-5 text-sm">
                {lastScorers.length > 0 && <p className="text-muted"><span className="text-ink">Goals</span> · {lastScorers.map((s) => `${s.player}${s.goals > 1 ? ` ${s.goals}` : ""}`).join(", ")}</p>}
                {last.motm && <IconText icon={<MotmStar />} gap="gap-1.5" className="text-muted"><span className="text-ink">Man of the match</span> · {last.motm}</IconText>}
                {!lastScorers.length && !last.motm && <p className="text-muted">Match report and line-up</p>}
              </div>
            </Link>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {current && (
          <Panel as="article" flush title={`Season ${current.number}`} right={<ArrowLink href={seasonHref(current.id)}>{current.period}</ArrowLink>}>
            <RecordStrip s={current.summary} animate />
            <div className="card-pad grid grid-cols-1 gap-6 border-t border-ink/10 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div><p className="eyebrow mb-3">Most appearances</p><LeaderList items={sApps} color="bg-ink" emptyText="The season hasn't started yet" /></div>
              <div><p className="eyebrow mb-3">Top scorers</p><LeaderList items={sScorers} emptyText="No goals yet this season" /></div>
            </div>
          </Panel>
        )}
        <Panel as="article" flush title="All time" right={<span className="text-sm text-muted">{data.seasons.length} seasons since {since}</span>}>
          <RecordStrip s={data.allTime} animate />
          <div className="card-pad grid grid-cols-1 gap-6 border-t border-ink/10 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div><p className="eyebrow mb-3">Most appearances</p><LeaderList items={topApps} color="bg-ink" /></div>
            <div><p className="eyebrow mb-3">Top scorers</p><LeaderList items={topScorers} /></div>
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <Panel title="Form" sub="The last eight league matches">
          <FormStrip matches={[...recent].reverse()} />
          <ul className="mt-5 divide-y divide-ink/8 text-sm">
            {[...recent].reverse().slice(0, 4).map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="focus-ring group flex items-center gap-3 rounded py-2.5"><ResultPill result={m.result} size="sm" /><span className="min-w-0 truncate text-ink group-hover:text-accent"><span className="tabular font-medium">{scoreline(m)}</span> v {m.opponent}</span><span className="ml-auto shrink-0 text-xs text-muted">{fmtDate(m.date, { day: "numeric", month: "short" })}</span></Link></li>)}
          </ul>
        </Panel>
        <Panel title="Coming up" sub={current?.venue} right={<Link href="/matches" className="link text-sm">All fixtures</Link>}>
          {upcoming.length ? <div className="-mx-3 grid grid-cols-1 gap-0.5">{upcoming.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div> : <p className="text-sm text-muted">{next ? "That's the last fixture on the calendar for now." : "No fixtures scheduled yet."}</p>}
        </Panel>
      </section>

      {(talking.length > 0 || milestones.length > 0) && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {talking.length > 0 && (
            <Panel title="In numbers" right={<Link href="/stats" className="link text-sm">Statistics</Link>}>
              <ul className="divide-y divide-ink/8">
                {talking.map((t) => (
                  <li key={t.key}>
                    <Link href={t.href ?? "/stats"} className="focus-ring group flex items-start gap-3 rounded py-3 text-[15px] leading-snug">
                      <span className="min-w-0 flex-1 text-ink group-hover:text-accent">{t.text}</span>
                      <span className="icon-line" aria-hidden><ArrowRight size={15} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {milestones.length > 0 && (
            <Panel title="Milestones" sub="Within reach of a round number">
              <ul className="space-y-3">
                {milestones.map((ms) => (
                  <li key={`${ms.player.slug}-${ms.kind}`} className="flex items-baseline-last gap-3">
                    <span className="self-center"><Avatar name={ms.player.name} photo={ms.player.extra.photo} size={38} /></span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <PlayerLink name={ms.player.name} player={ms.player} className="block truncate text-sm" />
                      <span className="block text-xs text-muted">{ms.away} {KIND[ms.kind][ms.away === 1 ? 0 : 1]} to go</span>
                    </span>
                    <span className="shrink-0 text-right leading-none">
                      <span className="display block text-3xl leading-none text-ink">{ms.target}</span>
                      <span className="eyebrow eyebrow-sm block">{KIND_LABEL[ms.kind]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>
      )}

      <section>
        <SectionTitle right={<Link href="/records" className="link text-sm">All records</Link>}>Records</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
          {rec.biggestWin && <RecordCard compact label="Biggest win" value={scoreline(rec.biggestWin)} sub={`v ${rec.biggestWin.opponent} · ${fmtDate(rec.biggestWin.date)}`} href={`/matches/${rec.biggestWin.id}`} />}
          {rec.heaviestDefeat && <RecordCard compact label="Heaviest defeat" value={scoreline(rec.heaviestDefeat)} sub={`v ${rec.heaviestDefeat.opponent} · ${fmtDate(rec.heaviestDefeat.date)}`} href={`/matches/${rec.heaviestDefeat.id}`} />}
          {rec.longestUnbeaten && <RecordCard compact label="Longest unbeaten run" value={<>{rec.longestUnbeaten.length} <span className="text-2xl text-muted">{rec.longestUnbeaten.length === 1 ? "match" : "matches"}</span></>} sub={`${fmtDate(rec.longestUnbeaten.start.date)} – ${fmtDate(rec.longestUnbeaten.end.date)}`} href="/records" />}
        </div>
      </section>

      <Sponsors />
    </div>
    </PageTransition>
  );
}
