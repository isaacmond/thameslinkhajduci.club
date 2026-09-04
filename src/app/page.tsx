import Link from "next/link";
import { ArrowRight, Database, Flame, Skull, Trophy } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, currentStreak, fmtDate, form, lastResult, leaderboard, nextFixture, records, scoreline, seasonPlayers } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { serviceStatus } from "@/lib/captions";
import { Crest, FormStrip, LeaderList, MatchRow, RecordStrip, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { DepartureBoard, type BoardRow } from "@/components/board";
import { Sponsors } from "@/components/footer";
import { PageTransition } from "@/components/page-transition";

export default async function Home() {
  const data = await getData();
  const current = data.seasons.find((s) => s.isCurrent) ?? data.seasons[data.seasons.length - 1];
  const next = nextFixture(data), last = lastResult(data);
  const rec = records(data), streak = currentStreak(data.matches);
  const topScorers = leaderboard(data.players, "goals").slice(0, 3), topApps = leaderboard(data.players, "apps").slice(0, 3);
  const sp = current ? seasonPlayers(data, current.id) : [];
  const sScorers = leaderboard(sp, "goals").slice(0, 3), sApps = leaderboard(sp, "apps").slice(0, 3);
  const today = londonToday();
  const upcoming = current ? chronological(current.matches).filter((m) => !m.played && m.date && m.date >= today).slice(0, 4) : [];
  const recent = form(data.matches, 8);
  const readAt = new Date(data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

  const rows: BoardRow[] = [];
  if (next) rows.push({ time: next.kickOff ?? "TBC", label: "Next fixture", destination: `${next.opponent} · ${fmtDate(next.date, { weekday: "short", day: "numeric", month: "short" })}`, status: "Expected", shortStatus: "Expected", tone: "late", href: `/matches/${next.id}` });
  if (last) { const s = serviceStatus(last.result); rows.push({ time: fmtDate(last.date, { day: "2-digit", month: "2-digit" }), label: "Last result", destination: `${last.result === "W" ? "Beat" : last.result === "L" ? "Lost to" : "Drew with"} ${last.opponent} ${scoreline(last)}`, status: s.word, shortStatus: s.word, tone: s.tone, href: `/matches/${last.id}` }); }
  if (streak) rows.push({ time: `${streak.length}×`, label: "Current run", destination: streak.type === "W" ? `${streak.length} win${streak.length > 1 ? "s" : ""} on the bounce` : streak.type === "L" ? `${streak.length} defeat${streak.length > 1 ? "s" : ""} in a row` : `${streak.length} draw${streak.length > 1 ? "s" : ""} running`, status: streak.type === "W" ? "Good service" : streak.type === "L" ? "Severe delays" : "Minor delays", shortStatus: streak.type === "W" ? "Good" : "Delays", tone: streak.type === "W" ? "ok" : streak.type === "L" ? "bad" : "late", href: "/records" });
  if (topScorers[0]) rows.push({ time: String(topScorers[0].value), label: "Top scorer", destination: `${topScorers[0].player.name} · all-time goals`, status: "Golden boot", shortStatus: "Boot", tone: "ok", href: `/squad/${topScorers[0].player.slug}` });
  if (topApps[0]) rows.push({ time: String(topApps[0].value), label: "Most apps", destination: `${topApps[0].player.name} · never misses a Tuesday`, status: "Season ticket", shortStatus: "Ticket", tone: "ok", href: `/squad/${topApps[0].player.slug}` });
  rows.push({ time: String(data.allTime.goalsAgainst), label: "Conceded", destination: "Goals against, all-time, and counting", status: "Replacement bus", shortStatus: "Bus", tone: "bad", href: "/records" });

  return (
    <PageTransition>
    <div className="space-y-8 sm:space-y-10">
      <section className="pitch card-solid relative overflow-hidden px-5 py-7 animate-rise sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-mint/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/10 px-2.5 py-1 font-medium text-mint-soft"><span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-soft" aria-hidden />Live · updated {readAt}</span>
              {data.stale && <Tag tone="gold">Showing last good data</Tag>}
              {current && <span className="eyebrow hidden sm:inline">{current.venue}</span>}
            </p>
            <div className="flex items-center gap-4">
              <Crest size={84} className="shrink-0 lg:hidden" />
              <h1 className="display text-5xl leading-[0.92] text-cream sm:text-7xl lg:text-8xl">Thameslink<br />Hajduci</h1>
            </div>
            <p className="mt-3 max-w-xl text-sm text-ash sm:mt-4 sm:text-lg">Six-a-side football club. Established 2024 in East London.<span className="hidden sm:inline"> Running approximately twelve minutes behind schedule ever since.</span></p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/squad" className="focus-ring rounded-lg bg-mint px-4 py-2.5 text-center font-semibold text-night transition-colors hover:bg-mint-soft">Meet the squad</Link>
              <Link href="/matches" className="focus-ring rounded-lg border border-white/15 px-4 py-2.5 text-center font-semibold text-cream transition-colors hover:bg-white/10">Fixtures &amp; results</Link>
              <Link href="/data" className="focus-ring hidden items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream transition-colors hover:bg-white/10 sm:inline-flex"><Database size={16} aria-hidden />Data &amp; API</Link>
            </div>
          </div>
          <Crest size={230} className="mx-auto hidden lg:mx-0 lg:block" />
        </div>
      </section>

      <DepartureBoard rows={rows} next={next && next.date ? { date: next.date, time: next.kickOff ?? "19:00", opponent: next.opponent, href: `/matches/${next.id}` } : null} station={current?.venue.split(/[—·(]/)[0].trim() || "Whitechapel"} />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <article className="card overflow-hidden">
          <header className="flex items-center justify-between bg-pine px-5 py-3"><h2 className="display text-2xl text-cream">All-time</h2><Tag>{data.seasons.length} seasons · since {fmtDate(data.matches.find((m) => m.date)?.date ?? null, { month: "short", year: "numeric" })}</Tag></header>
          <RecordStrip s={data.allTime} animate />
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div><SectionTitle right={<Link href="/stats" className="link py-1 text-xs">View all</Link>}><span className="text-xl">Season ticket holders</span></SectionTitle><LeaderList items={topApps} color="bg-cream" /></div>
            <div><SectionTitle right={<Link href="/stats" className="link py-1 text-xs">View all</Link>}><span className="text-xl">Golden boot</span></SectionTitle><LeaderList items={topScorers} /></div>
          </div>
        </article>
        {current && (
          <article className="card overflow-hidden">
            <header className="flex items-center justify-between bg-mint px-5 py-3 text-night"><h2 className="display text-2xl">Season {current.number}</h2><Link href={`/seasons/${current.id.toLowerCase()}`} className="focus-ring inline-flex items-center gap-1 rounded py-1 text-xs font-semibold uppercase tracking-wider hover:underline">{current.period} <ArrowRight size={14} aria-hidden /></Link></header>
            <RecordStrip s={current.summary} animate />
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div><SectionTitle right={<Link href={`/seasons/${current.id.toLowerCase()}`} className="link py-1 text-xs">Season</Link>}><span className="text-xl">Turned up</span></SectionTitle><LeaderList items={sApps} color="bg-cream" emptyText="Season hasn't kicked off yet" /></div>
              <div><SectionTitle right={<Link href={`/seasons/${current.id.toLowerCase()}`} className="link py-1 text-xs">Season</Link>}><span className="text-xl">Scored</span></SectionTitle><LeaderList items={sScorers} emptyText="No goals yet. Plenty of time." /></div>
            </div>
          </article>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="card p-5">
          <SectionTitle sub="Most recent games that count">Form</SectionTitle>
          <FormStrip matches={[...recent].reverse()} />
          <ul className="mt-4 space-y-2 text-sm">
            {[...recent].reverse().slice(0, 3).map((m) => <li key={m.id} className="flex items-center gap-2"><ResultPill result={m.result} size="sm" /><Link href={`/matches/${m.id}`} className="min-w-0 truncate text-cream hover:text-mint-soft">{scoreline(m)} vs {m.opponent}</Link><span className="ml-auto shrink-0 text-xs text-ash">{fmtDate(m.date, { day: "numeric", month: "short" })}</span></li>)}
          </ul>
          {streak && <p className="mt-4 text-sm italic text-cream/80">{streak.type === "L" ? `That's ${streak.length} in a row now. The board is monitoring the situation.` : streak.type === "W" ? `${streak.length} straight win${streak.length > 1 ? "s" : ""}. Nobody panic.` : "A draw. Everyone slightly confused."}</p>}
        </div>
        <div className="card p-5 lg:col-span-2">
          <SectionTitle right={<span className="flex gap-3"><Link href="/submit" className="link py-1 text-xs">Submit a score</Link><Link href="/matches" className="link py-1 text-xs">All fixtures</Link></span>} sub={current ? `${current.venue} · kick-offs vary, arrivals vary more` : undefined}>Coming up</SectionTitle>
          {upcoming.length ? <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{upcoming.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div> : <p className="text-sm text-ash">No fixtures scheduled. The committee is in talks. The committee is also in the pub.</p>}
        </div>
      </section>

      <section>
        <SectionTitle right={<Link href="/records" className="link py-1 text-xs">All records</Link>} sub="Numbers that will outlive us all">The record books</SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
          {rec.biggestWin && <Link href={`/matches/${rec.biggestWin.id}`} className="focus-ring card card-fame group p-5 transition-transform hover:-translate-y-0.5"><Trophy className="text-mint-soft" size={20} aria-hidden /><p className="eyebrow mt-3">Biggest win</p><p className="display mt-1 text-4xl text-cream">{scoreline(rec.biggestWin)}</p><p className="text-sm text-ash">vs {rec.biggestWin.opponent} · {fmtDate(rec.biggestWin.date)}</p></Link>}
          {rec.heaviestDefeat && <Link href={`/matches/${rec.heaviestDefeat.id}`} className="focus-ring card card-shame group p-5 transition-transform hover:-translate-y-0.5"><Skull className="text-[#ff9a9d]" size={20} aria-hidden /><p className="eyebrow mt-3">Heaviest defeat</p><p className="display mt-1 text-4xl text-cream">{scoreline(rec.heaviestDefeat)}</p><p className="text-sm text-ash">vs {rec.heaviestDefeat.opponent} · {fmtDate(rec.heaviestDefeat.date)}</p></Link>}
          {rec.longestUnbeaten && <Link href="/records" className="focus-ring card card-fame group p-5 transition-transform hover:-translate-y-0.5"><Flame className="text-gold" size={20} aria-hidden /><p className="eyebrow mt-3">Longest unbeaten run</p><p className="display mt-1 text-4xl text-cream">{rec.longestUnbeaten.length} games</p><p className="text-sm text-ash">{fmtDate(rec.longestUnbeaten.start.date, { month: "short", year: "numeric" })} – {fmtDate(rec.longestUnbeaten.end.date, { month: "short", year: "numeric" })}</p></Link>}
        </div>
      </section>

      <Sponsors />
    </div>
    </PageTransition>
  );
}
