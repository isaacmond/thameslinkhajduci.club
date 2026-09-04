import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { getData } from "@/lib/data";
import { assistersFor, chronological, fmtDate, fmtMoney, gwLabel, headToHead, opponentKey, playedMatches, scorersFor, scoreline, seasonHref } from "@/lib/stats";
import { londonEpoch, londonToday } from "@/lib/time";
import { matchVerdict, serviceStatus } from "@/lib/captions";
import { PlayerLink, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { Countdown } from "@/components/board";
import { sponsorFor } from "@/components/footer";
import { ShareButton } from "@/components/share-button";
import { MatchPreview } from "@/components/match-preview";
import { PageTransition } from "@/components/page-transition";

export async function generateStaticParams() {
  const data = await getData();
  return data.matches.map((m) => ({ id: m.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getData();
  const m = data.matches.find((x) => x.id === id);
  if (!m) notFound();
  const title = m.played ? `Hajduci ${m.ourGoals}–${m.theirGoals} ${m.opponent}` : `Hajduci vs ${m.opponent}`;
  return { title, description: `${m.seasonId === "FR" ? "Friendly" : `${m.seasonId} GW${m.gw}`} · ${fmtDate(m.date)}${m.motm ? ` · MOTM ${m.motm}` : ""}` };
}

const statusText = { ok: "text-mint-soft", late: "text-[#ffe27a]", bad: "text-[#ff9a9d]", muted: "text-ash" } as const;

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const m = data.matches.find((x) => x.id === id);
  if (!m) notFound();
  const season = (m.seasonId === "FR" ? data.friendlies : data.seasons.find((s) => s.id === m.seasonId))!;
  const all = chronological(data.matches);
  const idx = all.findIndex((x) => x.id === m.id);
  const prev = idx > 0 ? all[idx - 1] : null, next = idx < all.length - 1 ? all[idx + 1] : null;
  const h2h = headToHead(data.matches).find((o) => o.key === opponentKey(m.opponent));
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const lineup = [...m.lineup].filter((l) => l.played).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
  const ghosts = m.lineup.filter((l) => !l.played && (l.goals || l.assists));
  const scorers = scorersFor(m), assisters = assistersFor(m);
  const isForfeit = /forfeit/i.test(m.type ?? "") || /^forfeit$/i.test(m.opponent);
  const opponentLabel = /^forfeit$/i.test(m.opponent) ? "Nobody (forfeit)" : m.opponent;
  const kickoff = m.date && m.kickOff ? londonEpoch(m.date, m.kickOff) : null;
  const status = serviceStatus(m.played ? m.result : null);
  const seasonCounted = chronological(playedMatches(season.matches));
  const firstWin = m.result === "W" && !seasonCounted.some((x) => x.result === "W" && (x.date ?? "") < (m.date ?? "") && x.id !== m.id);
  const verdict = matchVerdict(m, scorers[0]?.goals ?? 0, scorers[0]?.player ?? null, firstWin);
  const sponsor = sponsorFor(m.id);
  // A forecast only makes sense before kick-off: an old fixture that never got a score would otherwise be "predicted" from games played after it.
  const showPreview = !m.played && !isForfeit && (!m.date || m.date >= londonToday());
  const shareText = m.played ? `Thameslink Hajduci ${m.ourGoals}–${m.theirGoals} ${opponentLabel} · ${status.word}${m.motm ? ` · MOTM ${m.motm}` : ""}` : `Thameslink Hajduci vs ${m.opponent} · ${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })} ${m.kickOff ?? ""}`;

  return (
    <PageTransition>
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-ash" aria-label="Breadcrumb"><Link href="/matches" className="link">Matches</Link> / <Link href={seasonHref(season.id)} className="link">{season.id === "FR" ? "Friendlies" : `Season ${season.number}`}</Link> / {gwLabel(m)}</nav>

      <section className="card-solid pitch relative overflow-hidden p-5 animate-rise sm:p-10">
        <div className={clsx("pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl", m.result === "W" ? "bg-mint/25" : m.result === "L" ? "bg-loss/15" : "bg-gold/15")} aria-hidden />
        <div className="relative">
          <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ash">
            <span className="eyebrow">{season.id === "FR" ? "Friendly" : `${season.id} · GW${m.gw}`}</span>
            <span>{fmtDate(m.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{m.kickOff && ` · ${m.kickOff}`}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{season.venue}</span>
            {m.played && <ResultPill result={m.result} size="sm" />}
            {m.type && <Tag tone="gold">{m.type} · not counted</Tag>}
          </p>
          <h1 className="grid items-center gap-3 text-cream sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-6">
            <span className="display min-w-0 break-words text-4xl leading-none sm:text-right sm:text-6xl">Thameslink Hajduci</span>
            <span className="flex flex-col items-center gap-1">
              {m.played ? <span className="display tabular text-7xl leading-none sm:text-8xl">{m.ourGoals}<span className="mx-2 text-ash">–</span>{m.theirGoals}</span> : <span className="display text-4xl text-ash sm:text-5xl">{m.kickOff ?? "TBC"}</span>}
              <span className={clsx("board-glow font-mono text-sm uppercase tracking-[0.3em]", statusText[status.tone])}>{status.word}</span>
            </span>
            <span className="display min-w-0 break-words text-4xl leading-none sm:text-6xl [text-wrap:balance]">{opponentLabel}</span>
          </h1>
          {!m.played && kickoff && <p className="mt-6 text-center text-sm text-ash">Kick-off in <Countdown target={kickoff} className="display text-3xl text-gold" /></p>}
          <p className="mt-6 text-center text-lg italic text-cream/90 sm:text-xl">{m.comment ? <>“{m.comment}”</> : verdict}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {m.motm && <span className="chip border-gold/40 bg-gold/10 text-gold"><Star size={12} aria-hidden />MOTM <PlayerLink name={m.motm} player={byName.get(m.motm)} className="!text-gold" /></span>}
            {m.playersInGame > 0 && <Tag>{m.playersInGame} Hajduci on the pitch</Tag>}
            {m.matchCost > 0 && <Tag>Pitch {fmtMoney(m.matchCost)} · {fmtMoney(m.costPerPlayer)} each</Tag>}
            <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="chip text-ash hover:text-cream" title={sponsor.tagline}>Match sponsor: {sponsor.name}</a>
            <ShareButton title={shareText} text={shareText} image={`/matches/${m.id}/opengraph-image`} filename={`hajduci-${m.id}.png`} />
            <Link href={`/submit?match=${m.id}`} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint-soft transition-colors hover:bg-mint/20">{m.played ? "Correct this score" : "Submit the score"}</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className={clsx("card overflow-hidden", m.played || showPreview || (h2h && !isForfeit && h2h.matches.some((x) => x.id !== m.id)) ? "lg:col-span-3" : "lg:col-span-5")}>
          <div className="p-5 pb-2"><SectionTitle sub={m.played ? (lineup.length ? "Who turned up, and what they did about it" : "No appearance marks recorded for this one") : "Squad TBC. As is our attendance."}>Line-up</SectionTitle></div>
          {lineup.length > 0 && (
            <div className="scroll-x overflow-x-auto">
              <table className="stats">
                <thead><tr><th>Player</th><th className="num">Goals</th><th className="num">Assists</th><th className="whitespace-nowrap text-right">Award</th></tr></thead>
                <tbody>
                  {lineup.map((l) => (
                    <tr key={l.player}>
                      <td><PlayerLink name={l.player} player={byName.get(l.player)} avatar /></td>
                      <td className={clsx("num display text-xl", l.goals > 0 ? "text-mint-soft" : "text-ash/40")}>{l.goals || "·"}</td>
                      <td className={clsx("num display text-xl", l.assists > 0 ? "text-cream" : "text-ash/40")}>{l.assists || "·"}</td>
                      <td className="text-right text-xs text-gold">{m.motm === l.player && <span className="inline-flex items-center gap-1"><Star size={12} aria-hidden />MOTM</span>}</td>
                    </tr>
                  ))}
                  {ghosts.map((l) => <tr key={l.player} className="opacity-70"><td><PlayerLink name={l.player} player={byName.get(l.player)} avatar /> <span className="text-xs text-ash">(no appearance mark)</span></td><td className="num display text-xl text-mint-soft">{l.goals || "·"}</td><td className="num display text-xl">{l.assists || "·"}</td><td></td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="space-y-6 lg:col-span-2">
          {m.played && (
            <div className="card p-5">
              <SectionTitle>Summary</SectionTitle>
              <dl className="space-y-3 text-sm">
                <div><dt className="eyebrow">Scorers</dt><dd className="mt-1 text-cream">{scorers.length ? scorers.map((s) => `${s.player}${s.goals > 1 ? ` ×${s.goals}` : ""}`).join(", ") : (m.ourGoals ?? 0) > 0 ? "Goals recorded, scorers lost to history" : "Nobody. Not one."}</dd></div>
                <div><dt className="eyebrow">Assists</dt><dd className="mt-1 text-cream">{assisters.length ? assisters.map((s) => `${s.player}${s.assists > 1 ? ` ×${s.assists}` : ""}`).join(", ") : "None claimed, remarkably"}</dd></div>
                <div><dt className="eyebrow">Verdict</dt><dd className="mt-1 text-cream">{verdict}</dd></div>
                {!m.scorersRecorded && (m.ourGoals ?? 0) > 0 && <div><dt className="eyebrow">Note</dt><dd className="mt-1 text-ash">Scorers weren&apos;t logged, so this game doesn&apos;t count towards anyone&apos;s goals-per-game.</dd></div>}
              </dl>
            </div>
          )}
          {showPreview && <MatchPreview data={data} match={m} />}
          {h2h && !isForfeit && (m.played || h2h.matches.some((x) => x.id !== m.id)) && (
            <div className="card p-5">
              <SectionTitle sub={`${h2h.played} meeting${h2h.played === 1 ? "" : "s"} across ${h2h.seasons.join(", ")}`}>Head to head</SectionTitle>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {([["Won", h2h.won, "text-mint-soft"], ["Drawn", h2h.drawn, "text-[#ffe27a]"], ["Lost", h2h.lost, "text-[#ff9a9d]"]] as [string, number, string][]).map(([k, v, c]) => <div key={k} className="flex flex-col-reverse"><dt className="eyebrow">{k}</dt><dd className={clsx("display text-3xl", c)}>{v}</dd></div>)}
              </dl>
              <p className="mt-2 text-center text-xs text-ash">Goals {h2h.gf}–{h2h.ga}</p>
              {h2h.matches.filter((x) => x.id !== m.id).length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {[...h2h.matches].filter((x) => x.id !== m.id).reverse().map((x) => <li key={x.id} className="flex items-center gap-2"><ResultPill result={x.result} size="sm" /><Link href={`/matches/${x.id}`} className="link">{scoreline(x)}</Link><span className="ml-auto text-xs text-ash">{x.seasonId} · {fmtDate(x.date)}</span></li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <nav className="grid grid-cols-2 gap-3" aria-label="Adjacent matches">
        {prev ? <Link href={`/matches/${prev.id}`} className="focus-ring card flex min-w-0 items-center gap-2 p-3 transition-colors hover:border-white/20 sm:gap-3 sm:p-4"><ChevronLeft className="shrink-0" aria-hidden /><span className="min-w-0"><span className="eyebrow block">Previous</span><span className="block truncate text-sm text-cream"><span className="hidden sm:inline">{scoreline(prev)} vs </span>{prev.opponent}</span><span className="block text-xs text-ash">{fmtDate(prev.date)}</span></span></Link> : <span />}
        {next ? <Link href={`/matches/${next.id}`} className="focus-ring card flex min-w-0 items-center justify-end gap-2 p-3 text-right transition-colors hover:border-white/20 sm:gap-3 sm:p-4"><span className="min-w-0"><span className="eyebrow block">Next</span><span className="block truncate text-sm text-cream"><span className="hidden sm:inline">{next.played ? scoreline(next) : next.kickOff ?? "TBC"} vs </span>{next.opponent}</span><span className="block text-xs text-ash">{fmtDate(next.date)}</span></span><ChevronRight className="shrink-0" aria-hidden /></Link> : <span />}
      </nav>
    </div>
    </PageTransition>
  );
}
