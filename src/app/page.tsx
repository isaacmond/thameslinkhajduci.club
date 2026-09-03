import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Database, Flame, Skull, Trophy } from "lucide-react";
import { getData } from "@/lib/data";
import type { SeasonSummary } from "@/lib/types";
import { chronological, currentStreak, fmtDate, form, lastResult, leaderboard, nextFixture, ppg, records, scoreline, seasonPlayers, signed } from "@/lib/stats";
import { Crest, FormStrip, LeaderList, MatchRow, SectionTitle, Tag } from "@/components/ui";
import { DepartureBoard, type BoardRow } from "@/components/board";
import { Sponsors } from "@/components/footer";
import { CountUp } from "@/components/count-up";
import { PageTransition } from "@/components/page-transition";

function RecordStrip({ s }: { s: SeasonSummary }) {
  const cells: [string, number, string][] = [["Played", s.played, "text-cream"], ["Won", s.won, "text-mint-soft"], ["Drawn", s.drawn, "text-[#ffe27a]"], ["Lost", s.lost, "text-[#ff9a9d]"]];
  return (
    <div>
      <dl className="grid grid-cols-4 divide-x divide-white/10 text-center">
        {cells.map(([k, v, c]) => <div key={k} className="py-4"><dd className={clsx("display tabular text-4xl leading-none sm:text-5xl", c)}><CountUp value={v} /></dd><dt className="eyebrow mt-1">{k}</dt></div>)}
      </dl>
      <p className="border-y border-white/10 bg-white/[0.03] px-4 py-2 text-center text-xs text-ash">GF <span className="text-cream">{s.goalsFor}</span> · GA <span className="text-cream">{s.goalsAgainst}</span> · GD <span className="text-cream">{signed(s.goalsFor - s.goalsAgainst)}</span> · <span className="text-cream">{ppg(s).toFixed(2)}</span> pts/game</p>
    </div>
  );
}

export default async function Home() {
  const data = await getData();
  const current = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1];
  const next = nextFixture(data), last = lastResult(data);
  const rec = records(data), streak = currentStreak(data.matches);
  const topScorers = leaderboard(data.players, "goals").slice(0, 3), topApps = leaderboard(data.players, "apps").slice(0, 3);
  const sp = current ? seasonPlayers(data, current.id) : [];
  const sScorers = leaderboard(sp, "goals").slice(0, 3), sApps = leaderboard(sp, "apps").slice(0, 3);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = current ? chronological(current.matches).filter((m) => !m.played && m.date && m.date >= today).slice(0, 4) : [];
  const recent = form(data.matches, 8);
  const readAt = new Date(data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

  const rows: BoardRow[] = [];
  if (next) rows.push({ time: next.kickOff ?? "TBC", label: "Next fixture", destination: `${next.opponent} · ${fmtDate(next.date, { weekday: "short", day: "numeric", month: "short" })}`, status: "Expected", tone: "late", href: `/matches/${next.id}` });
  if (last) rows.push({ time: fmtDate(last.date, { day: "2-digit", month: "2-digit" }), label: "Last result", destination: `${last.result === "W" ? "Beat" : last.result === "L" ? "Lost to" : "Drew with"} ${last.opponent} ${scoreline(last)}`, status: last.result === "W" ? "On time" : last.result === "D" ? "Delayed" : "Cancelled", tone: last.result === "W" ? "ok" : last.result === "D" ? "late" : "bad", href: `/matches/${last.id}` });
  if (streak) rows.push({ time: `${streak.length}×`, label: "Current run", destination: streak.type === "W" ? `${streak.length} win${streak.length > 1 ? "s" : ""} on the bounce` : streak.type === "L" ? `${streak.length} defeat${streak.length > 1 ? "s" : ""} in a row` : `${streak.length} draw${streak.length > 1 ? "s" : ""} running`, status: streak.type === "W" ? "Good service" : streak.type === "L" ? "Severe delays" : "Minor delays", tone: streak.type === "W" ? "ok" : streak.type === "L" ? "bad" : "late", href: "/records" });
  if (topScorers[0]) rows.push({ time: String(topScorers[0].value), label: "Top scorer", destination: `${topScorers[0].player.name} · all-time goals`, status: "Golden boot", tone: "ok", href: `/squad/${topScorers[0].player.slug}` });
  if (topApps[0]) rows.push({ time: String(topApps[0].value), label: "Most apps", destination: `${topApps[0].player.name} · never misses a Tuesday`, status: "Season ticket", tone: "ok", href: `/squad/${topApps[0].player.slug}` });
  rows.push({ time: String(data.allTime.goalsAgainst), label: "Conceded", destination: "Goals against, all-time, and counting", status: "Replacement bus", tone: "bad", href: "/records" });

  return (
    <PageTransition>
    <div className="space-y-10">
      <section className="pitch card-solid relative overflow-hidden px-6 py-10 animate-rise sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-mint/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/10 px-2.5 py-1 font-medium text-mint-soft"><span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-soft" aria-hidden />Live from the spreadsheet · read {readAt}</span>
              {data.stale && <Tag tone="gold">Sheet unreachable, showing last good read</Tag>}
              {current && <span className="eyebrow">{current.venue}</span>}
            </p>
            <h1 className="display text-6xl leading-[0.92] text-cream sm:text-8xl">Thameslink<br />Hajduci</h1>
            <p className="mt-4 max-w-xl text-base text-ash sm:text-lg">Six-a-side football club. Established 2024 in East London. Running approximately twelve minutes behind schedule ever since.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/squad" className="focus-ring rounded-lg bg-mint px-4 py-2.5 font-semibold text-night transition-colors hover:bg-mint-soft">Meet the squad</Link>
              <Link href="/matches" className="focus-ring rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream transition-colors hover:bg-white/10">Results &amp; fixtures</Link>
              <Link href="/data" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream transition-colors hover:bg-white/10"><Database size={16} aria-hidden />Data &amp; API</Link>
            </div>
          </div>
          <Crest size={230} className="mx-auto lg:mx-0" />
        </div>
      </section>

      <DepartureBoard rows={rows} next={next && next.date ? { date: next.date, time: next.kickOff ?? "19:00", opponent: next.opponent, href: `/matches/${next.id}` } : null} station={current?.venue.split(/[—·(]/)[0].trim() || "Whitechapel"} />

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card overflow-hidden">
          <header className="flex items-center justify-between bg-pine px-5 py-3"><h2 className="display text-2xl text-cream">All-time</h2><Tag>{data.seasons.length} seasons · since {fmtDate(data.matches.find((m) => m.date)?.date ?? null, { month: "short", year: "numeric" })}</Tag></header>
          <RecordStrip s={data.allTime} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div><SectionTitle right={<Link href="/stats" className="link text-xs">View all</Link>}><span className="text-xl">Most appearances</span></SectionTitle><LeaderList items={topApps} color="bg-blue-400" /></div>
            <div><SectionTitle right={<Link href="/stats" className="link text-xs">View all</Link>}><span className="text-xl">Top scorers</span></SectionTitle><LeaderList items={topScorers} /></div>
          </div>
        </article>
        {current && (
          <article className="card overflow-hidden">
            <header className="flex items-center justify-between bg-mint px-5 py-3 text-night"><h2 className="display text-2xl">Season {current.number}</h2><Link href={`/seasons/${current.id.toLowerCase()}`} className="focus-ring inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:underline">{current.period} <ArrowRight size={14} aria-hidden /></Link></header>
            <RecordStrip s={current.summary} />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div><SectionTitle right={<Link href={`/seasons/${current.id.toLowerCase()}`} className="link text-xs">Season</Link>}><span className="text-xl">Most appearances</span></SectionTitle><LeaderList items={sApps} color="bg-blue-400" emptyText="Season hasn't kicked off yet" /></div>
              <div><SectionTitle right={<Link href={`/seasons/${current.id.toLowerCase()}`} className="link text-xs">Season</Link>}><span className="text-xl">Top scorers</span></SectionTitle><LeaderList items={sScorers} emptyText="No goals yet. Plenty of time." /></div>
            </div>
          </article>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <SectionTitle sub="Most recent first-team games that count">Form</SectionTitle>
          <div className="flex flex-wrap gap-1.5"><FormStrip matches={[...recent].reverse()} /></div>
          {last && <p className="mt-4 text-sm text-ash">Last time out: <Link href={`/matches/${last.id}`} className="link">{scoreline(last)} vs {last.opponent}</Link>{last.motm && <>, MOTM {last.motm}</>}.</p>}
          {streak && <p className="mt-1 text-sm text-ash">{streak.type === "L" ? `That's ${streak.length} in a row now. The board is monitoring the situation.` : streak.type === "W" ? `${streak.length} straight win${streak.length > 1 ? "s" : ""}. Nobody panic.` : "A draw. Everyone slightly confused."}</p>}
        </div>
        <div className="card p-5 lg:col-span-2">
          <SectionTitle right={<Link href="/matches" className="link text-xs">All fixtures</Link>} sub={current ? `${current.venue} · kick-offs vary, arrivals vary more` : undefined}>Coming up</SectionTitle>
          {upcoming.length ? <div className="space-y-1.5">{upcoming.map((m) => <MatchRow key={m.id} m={m} />)}</div> : <p className="text-sm text-ash">No fixtures scheduled. The committee is in talks. The committee is also in the pub.</p>}
        </div>
      </section>

      <section>
        <SectionTitle right={<Link href="/records" className="link text-xs">All records</Link>} sub="Numbers that will outlive us all">The record books</SectionTitle>
        <div className="stagger grid gap-4 sm:grid-cols-3">
          {rec.biggestWin && <Link href={`/matches/${rec.biggestWin.id}`} className="focus-ring card group p-5 transition-colors hover:border-mint/40"><Trophy className="text-mint-soft" size={20} aria-hidden /><p className="eyebrow mt-3">Biggest win</p><p className="display mt-1 text-4xl text-cream">{scoreline(rec.biggestWin)}</p><p className="text-sm text-ash">vs {rec.biggestWin.opponent} · {fmtDate(rec.biggestWin.date)}</p></Link>}
          {rec.heaviestDefeat && <Link href={`/matches/${rec.heaviestDefeat.id}`} className="focus-ring card group p-5 transition-colors hover:border-loss/40"><Skull className="text-[#ff9a9d]" size={20} aria-hidden /><p className="eyebrow mt-3">Heaviest defeat</p><p className="display mt-1 text-4xl text-cream">{scoreline(rec.heaviestDefeat)}</p><p className="text-sm text-ash">vs {rec.heaviestDefeat.opponent} · {fmtDate(rec.heaviestDefeat.date)}</p></Link>}
          {rec.longestUnbeaten && <Link href="/records" className="focus-ring card group p-5 transition-colors hover:border-gold/40"><Flame className="text-gold" size={20} aria-hidden /><p className="eyebrow mt-3">Longest unbeaten run</p><p className="display mt-1 text-4xl text-cream">{rec.longestUnbeaten.length} games</p><p className="text-sm text-ash">{fmtDate(rec.longestUnbeaten.start.date, { month: "short", year: "numeric" })} – {fmtDate(rec.longestUnbeaten.end.date, { month: "short", year: "numeric" })}</p></Link>}
        </div>
      </section>

      <Sponsors />
    </div>
    </PageTransition>
  );
}
