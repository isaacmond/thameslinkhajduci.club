import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, MapPin, Vote } from "lucide-react";
import { getData } from "@/lib/data";
import { dbConfigured } from "@/lib/db";
import { getSquad } from "@/lib/writes";
import { pollSummary } from "@/lib/motm-polls";
import { fmtCloses } from "@/lib/motm";
import { assistersFor, chronological, fmtDate, fmtMoney, gwLabel, headToHead, leaderboard, opponentKey, playedMatches, scorersFor, scoreline, seasonHref, seasonPlayers } from "@/lib/stats";
import { londonEpoch, londonToday } from "@/lib/time";
import { matchVerdict, resultWord } from "@/lib/captions";
import { Breadcrumb, Crest, LeaderList, MotmStar, PlayerLink, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { TeamBadge } from "@/components/team-badge";
import { sponsorFor } from "@/components/footer";
import { ShareButton } from "@/components/share-button";
import { MatchPreview } from "@/components/match-preview";
import { PollButton } from "@/components/poll-button";
import { btn } from "@/components/button";
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
  const title = m.played ? `Hajduci ${m.ourGoals}–${m.theirGoals} ${m.opponent}` : `Hajduci v ${m.opponent}`;
  return { title, description: `${m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonNumber}, ${gwLabel(m)}`} · ${fmtDate(m.date)}${m.motm ? ` · Man of the match ${m.motm}` : ""}` };
}

const resultText = { W: "text-win", D: "text-draw", L: "text-loss" } as const;

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
  const seasonCounted = chronological(playedMatches(season.matches));
  const firstWin = m.result === "W" && !seasonCounted.some((x) => x.result === "W" && (x.date ?? "") < (m.date ?? "") && x.id !== m.id);
  const verdict = isForfeit && m.played ? `Forfeit, awarded ${m.ourGoals}–${m.theirGoals}.` : matchVerdict(m, scorers[0]?.goals ?? 0, scorers[0]?.player ?? null, firstWin);
  // A forecast only makes sense before kick-off: an old fixture that never got a score would otherwise be "predicted" from games played after it.
  const sponsor = sponsorFor(m.id);
  const today = londonToday();
  const showPreview = !m.played && !isForfeit && (!m.date || m.date >= today);
  // The who's-in poll: for this game while it is still ahead, otherwise for the next one still to be played in the same competition.
  const upcoming = (x: typeof m) => !x.played && !/forfeit|cancel/i.test(x.type ?? "") && (!x.date || x.date >= today);
  const pollFor = upcoming(m) ? m : chronological(season.matches).find((x) => upcoming(x) && (x.date ?? "9999") >= (m.date ?? "")) ?? null;
  const squad = showPreview && dbConfigured() ? await getSquad(m.id).catch(() => null) : null;
  // The man-of-the-match vote: open (how many ballots are in) or decided (the count). Only league results have one.
  const poll = m.played && !isForfeit && m.countsForRecords && dbConfigured() ? await pollSummary(m.id).catch(() => null) : null;
  const shareText = m.played ? `Thameslink Hajduci ${m.ourGoals}–${m.theirGoals} ${opponentLabel}${m.motm ? ` · Man of the match ${m.motm}` : ""}` : `Thameslink Hajduci v ${m.opponent} · ${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })} ${m.kickOff ?? ""}`;

  return (
    <PageTransition>
    <div className="space-y-10">
      <Breadcrumb items={[{ href: "/matches", label: "Matches" }, { href: seasonHref(season.id), label: season.id === "FR" ? "Friendlies" : `Season ${season.number}` }, { label: gwLabel(m) }]} />

      <section className="card overflow-hidden animate-rise">
        <div className="px-5 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-8">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted">
            <span className="eyebrow">{season.id === "FR" ? "Friendly" : `Season ${season.number} · ${gwLabel(m)}`}</span>
            <span>{fmtDate(m.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{m.kickOff && ` · ${m.kickOff}`}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{season.venueUrl ? <a href={season.venueUrl} target="_blank" rel="noopener noreferrer" className="link">{season.venue}</a> : season.venue}</span>
            {m.type && <Tag>{m.type}</Tag>}
          </p>
          <h1 className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:items-center text-ink sm:gap-8">
            <span className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row-reverse sm:justify-start sm:text-right">
              <Crest size={64} className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
              <span className="display min-w-0 text-xl leading-tight [text-wrap:balance] sm:text-4xl">Thameslink Hajduci</span>
            </span>
            <span className="flex flex-col items-center gap-2 self-center">
              {m.played ? <span className="display whitespace-nowrap text-6xl leading-none sm:text-8xl">{m.ourGoals}<span className="mx-1.5 text-muted/60 sm:mx-3">–</span>{m.theirGoals}</span> : <span className="display text-4xl text-muted sm:text-6xl">v</span>}
              {m.played && m.result && <span className={clsx("eyebrow", resultText[m.result])}>{resultWord(m.result)}</span>}
            </span>
            <span className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:justify-start sm:text-left">
              {!/^forfeit$/i.test(m.opponent) && <TeamBadge name={m.opponent} size={64} className="h-12 w-12 sm:h-16 sm:w-16" />}
              <span className="display min-w-0 break-words text-xl leading-tight [text-wrap:balance] sm:text-4xl">{opponentLabel}</span>
            </span>
          </h1>
          {!m.played && kickoff && <p className="mt-8 text-center"><span className="eyebrow block">Kick-off in</span><Countdown target={kickoff} className="tabular mt-1 text-4xl font-semibold tracking-tight text-ink" /></p>}
          {(m.comment || verdict) && <p className="display mx-auto mt-8 max-w-2xl text-center text-xl italic leading-snug text-ink/85 sm:text-2xl">{m.comment ? <>“{m.comment}”</> : verdict}</p>}
        </div>
        <div className="space-y-3 border-t border-ink/10 bg-sunken/40 px-5 py-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {m.motm && <Tag tone="gold"><MotmStar />Man of the match <PlayerLink name={m.motm} player={byName.get(m.motm)} className="!text-gold" /></Tag>}
          {poll?.status === "open" && <Tag tone="gold"><Vote size={12} aria-hidden />Man of the match vote open · {poll.voted} of {poll.ballots} in · closes {fmtCloses(poll.closesAt)}</Tag>}
          {m.playersInGame > 0 && <Tag>{m.playersInGame} players{m.levy && <> · {m.levy.ringers.length} ringer{m.levy.ringers.length === 1 ? "" : "s"}</>}</Tag>}
          {m.matchCost > 0 && <Tag>Pitch {fmtMoney(m.matchCost)}{m.costPerPlayer > 0 && <> · {fmtMoney(m.costPerPlayer)} each</>}</Tag>}
          <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="chip chip-tap text-muted hover:text-ink" title={sponsor.tagline}>Match sponsor: {sponsor.name}</a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ShareButton title={shareText} text={shareText} image={`/matches/${m.id}/opengraph-image`} filename={`hajduci-${m.id}.png`} />
          <Link href={`/submit?match=${m.id}`} className={btn("secondary", "xs")}>{isForfeit && m.played ? "Edit the forfeit" : m.played ? "Edit the result" : "Add the result"}</Link>
          {pollFor && <PollButton fixture={pollFor} label={pollFor.id === m.id ? "Ask who's playing" : `Ask who's playing ${gwLabel(pollFor)}`} />}
        </div>
        </div>
      </section>

      {(() => {
        const showH2h = Boolean(h2h && !isForfeit && (m.played || h2h.matches.some((x) => x.id !== m.id)));
        // No team sheet yet: the season's regulars are the best guess at who will turn up.
        const usual = !m.played && season.id !== "FR" ? leaderboard(seasonPlayers(data, season.id), "apps").slice(0, 8) : [];
        // A forfeit's line-up is the bill: who was responsible, and what the pitch cost each of them.
        const lineupCard = isForfeit && m.played ? (
          <div className="card p-6">
            <SectionTitle sub={lineup.length ? `${lineup.length} players share the ${fmtMoney(m.matchCost)} pitch, ${fmtMoney(m.costPerPlayer)} each.` : "No one was charged for the pitch."}>Pitch charges</SectionTitle>
            {lineup.length > 0 && <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{lineup.map((l) => <li key={l.player} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-sunken/60 px-3 py-2"><PlayerLink name={l.player} player={byName.get(l.player)} avatar className="min-w-0 truncate text-sm" /><span className="tabular shrink-0 text-xs text-muted">{fmtMoney(l.cost)}</span></li>)}</ul>}
            <p className="mt-4 text-xs text-muted"><Link href={`/submit?match=${m.id}`} className="link">Edit the forfeit</Link></p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className={clsx("p-6", (lineup.length || usual.length) ? "pb-2" : "")}><SectionTitle sub={m.played ? (lineup.length ? `${lineup.length} players` : "No line-up recorded") : "To be confirmed"}>Line-up</SectionTitle></div>
            {!m.played && usual.length > 0 && (
              <div className="px-6 pb-6">
                <p className="eyebrow mb-3">Most appearances this season</p>
                <LeaderList items={usual} color="bg-ink" />
                <p className="mt-4 text-xs text-muted"><Link href={`/submit?match=${m.id}`} className="link">Add the result</Link> once it&apos;s played.</p>
              </div>
            )}
            {lineup.length > 0 && (
              <div className="scroll-x overflow-x-auto">
                <table className="stats">
                  <thead><tr><th>Player</th><th className="num">Goals</th><th className="num">Assists</th><th className="hidden whitespace-nowrap text-right sm:table-cell"><span className="sr-only">Man of the match</span></th></tr></thead>
                  <tbody>
                    {lineup.map((l) => (
                      <tr key={l.player}>
                        <td><span className="inline-flex max-w-full items-center gap-2 align-middle"><PlayerLink name={l.player} player={byName.get(l.player)} avatar />{m.motm === l.player && <MotmStar className="sm:hidden" label="Man of the match" />}{l.ringer && <Tag className="!py-0 leading-5 text-[10px]">Ringer</Tag>}</span></td>
                        <td className={clsx("num font-semibold", l.goals > 0 ? "text-ink" : "text-muted/70")}>{l.goals || "·"}</td>
                        <td className={clsx("num font-semibold", l.assists > 0 ? "text-ink" : "text-muted/70")}>{l.assists || "·"}</td>
                        <td className="hidden text-right text-xs text-gold sm:table-cell">{m.motm === l.player && <span className="inline-flex items-center gap-1"><MotmStar />Man of the match</span>}</td>
                      </tr>
                    ))}
                    {ghosts.map((l) => <tr key={l.player} className="opacity-70"><td><PlayerLink name={l.player} player={byName.get(l.player)} avatar /> <span className="text-xs text-muted">(no appearance recorded)</span></td><td className="num font-semibold">{l.goals || "·"}</td><td className="num font-semibold">{l.assists || "·"}</td><td className="hidden sm:table-cell"></td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
        // Before kick-off the admin's team sheet stands in for the line-up; the score form starts from the same list.
        const squadCard = squad && squad.players.length > 0 ? (
          <section className="card p-6" aria-labelledby="expected-squad">
            <SectionTitle id="expected-squad" sub={`${squad.players.length} players named`}>Expected squad</SectionTitle>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{squad.players.map((p) => <li key={p} className="flex min-w-0 items-center rounded-lg bg-sunken/60 px-3 py-2"><PlayerLink name={p} player={byName.get(p)} avatar className="min-w-0 truncate text-sm" /></li>)}</ul>
            {squad.note && <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-ink/90">{squad.note}</p>}
            <p className="mt-4 text-xs text-muted">When you <Link href={`/submit?match=${m.id}`} className="link">add the result</Link>, this squad is ticked for you.</p>
          </section>
        ) : null;
        const h2hCard = showH2h && h2h ? (
          <div key="h2h" className="card p-6">
            <SectionTitle sub={`${h2h.played} meeting${h2h.played === 1 ? "" : "s"}`}>Head to head</SectionTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {([["Won", h2h.won], ["Drawn", h2h.drawn], ["Lost", h2h.lost]] as [string, number][]).map(([k, v]) => <div key={k} className="flex flex-col-reverse"><dt className="eyebrow mt-1.5">{k}</dt><dd className="display text-4xl leading-none text-ink">{v}</dd></div>)}
            </dl>
            <p className="mt-3 text-center text-xs text-muted">Goals {h2h.gf}–{h2h.ga}</p>
            {h2h.matches.filter((x) => x.id !== m.id).length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {[...h2h.matches].filter((x) => x.id !== m.id).reverse().map((x) => <li key={x.id} className="flex items-center gap-2"><ResultPill result={x.result} size="sm" /><Link href={`/matches/${x.id}`} className="link">{scoreline(x)}</Link><span className="ml-auto text-xs text-muted">{fmtDate(x.date)}</span></li>)}
              </ul>
            )}
          </div>
        ) : null;
        if (m.played || !showPreview) {
          const side = [m.played && (
            <div key="summary" className="card p-6">
              <SectionTitle>Summary</SectionTitle>
              <dl className="space-y-3 text-sm">
                {isForfeit ? <div><dt className="eyebrow">Forfeit</dt><dd className="mt-1 text-ink">Awarded {m.ourGoals}–{m.theirGoals}. The pitch was still paid for.</dd></div> : (
                <div><dt className="eyebrow">Scorers</dt><dd className="mt-1 text-ink">{scorers.length ? scorers.map((s) => `${s.player}${s.goals > 1 ? ` (${s.goals})` : ""}`).join(", ") : (m.ourGoals ?? 0) > 0 ? "Not recorded" : "None"}</dd></div>
                )}
                {!isForfeit && <div><dt className="eyebrow">Assists</dt><dd className="mt-1 text-ink">{assisters.length ? assisters.map((s) => `${s.player}${s.assists > 1 ? ` (${s.assists})` : ""}`).join(", ") : "None recorded"}</dd></div>}
                {m.levy && (
                  <div>
                    <dt className="eyebrow">Ringer levy</dt>
                    <dd className="mt-1 text-ink">{m.levy.ringers.join(", ")} {m.levy.ringers.length === 1 ? "was a ringer" : "were ringers"} for the night. Their {fmtMoney(m.levy.total)} share of the pitch is split between {m.levy.payers.length} regular{m.levy.payers.length === 1 ? "" : "s"} who {m.levy.payers.length === 1 ? "wasn\u2019t" : "weren\u2019t"} playing, {fmtMoney(m.levy.each)} each.</dd>
                    <dd className="mt-1 text-xs text-muted">{m.levy.payers.join(", ")}</dd>
                  </div>
                )}
                {poll && (
                  <div>
                    <dt className="eyebrow">Man of the match vote</dt>
                    <dd className="mt-1 text-ink">
                      {poll.status === "open" ? <>Open until {fmtCloses(poll.closesAt)}. {poll.voted} of {poll.ballots} ballot{poll.ballots === 1 ? "" : "s"} returned. Everyone who played was sent one by email.</>
                        : poll.winner ? <>{poll.winner}, with {poll.counts?.[0]?.votes ?? 0} of {poll.voted} vote{poll.voted === 1 ? "" : "s"}. {poll.voted} of {poll.ballots} ballots returned.</>
                        : <>Closed without votes.{m.motm ? ` ${m.motm} was named with the result.` : ""}</>}
                      {poll.counts && poll.counts.some((c) => c.votes > 0) && <span className="mt-1 block text-xs text-muted">{poll.counts.filter((c) => c.votes > 0).map((c) => `${c.player} ${c.votes}`).join(" · ")}</span>}
                      {poll.noVote.length > 0 && <span className="mt-1 block text-xs text-muted">No ballot for {poll.noVote.join(", ")}: no email on the members list.</span>}
                      
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ), h2hCard].filter(Boolean);
          return (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className={clsx(side.length ? "lg:col-span-3" : "lg:col-span-5", "lg:[&>*]:h-full")}>{lineupCard}</div>
              {side.length > 0 && <div className="lg:col-span-2 space-y-6 lg:flex lg:flex-col lg:space-y-0 lg:gap-6 lg:[&>*:last-child]:flex-1">{side}</div>}
            </section>
          );
        }
        // Still to play: the team sheet (or the shrug) and the history on the left, the forecast with room to breathe on the right.
        return (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-6 lg:flex lg:flex-col lg:space-y-0 lg:gap-6 lg:[&>*:last-child]:flex-1">{squadCard ?? lineupCard}{h2hCard}</div>
            <div className="lg:col-span-3 lg:[&>*]:h-full"><MatchPreview data={data} match={m} /></div>
          </section>
        );
      })()}

      <nav className="grid grid-cols-2 gap-3" aria-label="Adjacent matches">
        {prev ? <Link href={`/matches/${prev.id}`} className="focus-ring card flex min-w-0 items-center gap-2 p-3 transition-shadow hover:shadow-lg sm:gap-3 sm:p-4"><ChevronLeft className="shrink-0 text-muted" aria-hidden /><span className="min-w-0"><span className="eyebrow block">Previous</span><span className="block truncate text-sm text-ink"><span className="hidden sm:inline">{scoreline(prev)} v </span>{prev.opponent}</span><span className="block text-xs text-muted">{fmtDate(prev.date)}</span></span></Link> : <span />}
        {next ? <Link href={`/matches/${next.id}`} className="focus-ring card flex min-w-0 items-center justify-end gap-2 p-3 text-right transition-shadow hover:shadow-lg sm:gap-3 sm:p-4"><span className="min-w-0"><span className="eyebrow block">Next</span><span className="block truncate text-sm text-ink"><span className="hidden sm:inline">{next.played ? `${scoreline(next)} v ` : ""}</span>{next.opponent}</span><span className="block text-xs text-muted">{fmtDate(next.date)}</span></span><ChevronRight className="shrink-0 text-muted" aria-hidden /></Link> : <span />}
      </nav>
    </div>
    </PageTransition>
  );
}
