import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, MapPin, Star, Vote } from "lucide-react";
import { getData } from "@/lib/data";
import { dbConfigured } from "@/lib/db";
import { getSquad } from "@/lib/writes";
import { pollSummary } from "@/lib/motm-polls";
import { fmtCloses } from "@/lib/motm";
import { assistersFor, chronological, fmtDate, fmtMoney, gwLabel, headToHead, leaderboard, opponentKey, playedMatches, scorersFor, scoreline, seasonHref, seasonPlayers } from "@/lib/stats";
import { londonEpoch, londonToday } from "@/lib/time";
import { matchVerdict, serviceStatus } from "@/lib/captions";
import { LeaderList, PlayerLink, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { Countdown } from "@/components/board";
import { sponsorFor } from "@/components/footer";
import { ShareButton } from "@/components/share-button";
import { MatchPreview } from "@/components/match-preview";
import { PollButton } from "@/components/poll-button";
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

const statusText = { ok: "text-mint-soft", late: "text-draw-soft", bad: "text-loss-soft", muted: "text-ash" } as const;

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
  const verdict = isForfeit && m.played ? `Forfeited. The league awarded it ${m.ourGoals}–${m.theirGoals} and nobody got to kick anything.` : matchVerdict(m, scorers[0]?.goals ?? 0, scorers[0]?.player ?? null, firstWin);
  const sponsor = sponsorFor(m.id);
  // A forecast only makes sense before kick-off: an old fixture that never got a score would otherwise be "predicted" from games played after it.
  const today = londonToday();
  const showPreview = !m.played && !isForfeit && (!m.date || m.date >= today);
  // The who's-in poll: for this game while it is still ahead, otherwise for the next one still to be played in the same competition.
  const upcoming = (x: typeof m) => !x.played && !/forfeit|cancel/i.test(x.type ?? "") && (!x.date || x.date >= today);
  const pollFor = upcoming(m) ? m : chronological(season.matches).find((x) => upcoming(x) && (x.date ?? "9999") >= (m.date ?? "")) ?? null;
  const squad = showPreview && dbConfigured() ? await getSquad(m.id).catch(() => null) : null;
  // The man-of-the-match vote: open (how many ballots are in) or decided (the count). Only league results have one.
  const poll = m.played && !isForfeit && m.countsForRecords && dbConfigured() ? await pollSummary(m.id).catch(() => null) : null;
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
            <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{season.venueUrl ? <a href={season.venueUrl} target="_blank" rel="noopener noreferrer" className="link">{season.venue}</a> : season.venue}</span>
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
            {m.motm && <span className="chip border-gold/40 bg-gold/10 text-gold"><Star size={12} aria-hidden />MOTM <PlayerLink name={m.motm} player={byName.get(m.motm)} className="!text-gold" />{poll?.status === "closed" && poll.winner === m.motm && <span className="font-normal text-gold/80">· voted</span>}</span>}
            {poll?.status === "open" && <Tag tone="gold"><Vote size={12} aria-hidden />MOTM vote open · {poll.voted}/{poll.ballots} in · closes {fmtCloses(poll.closesAt)}</Tag>}
            {m.playersInGame > 0 && <Tag>{m.playersInGame} Hajduci {isForfeit ? "paying for it" : "on the pitch"}</Tag>}
            {m.matchCost > 0 && <Tag>Pitch {fmtMoney(m.matchCost)}{m.costPerPlayer > 0 && <> · {fmtMoney(m.costPerPlayer)} each</>}</Tag>}
            <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="chip text-ash hover:text-cream" title={sponsor.tagline}>Match sponsor: {sponsor.name}</a>
            <ShareButton title={shareText} text={shareText} image={`/matches/${m.id}/opengraph-image`} filename={`hajduci-${m.id}.png`} />
            <Link href={`/submit?match=${m.id}`} className="focus-ring chip gap-1.5 border-mint/40 bg-mint/10 text-mint-soft transition-colors hover:bg-mint/20">{isForfeit && m.played ? "Amend the forfeit" : m.played ? "Correct this score" : "Submit the score"}</Link>
            {pollFor && <PollButton fixture={pollFor} label={pollFor.id === m.id ? "Poll the group chat" : `Poll for ${gwLabel(pollFor)} v ${pollFor.opponent}`} />}
          </div>
        </div>
      </section>

      {(() => {
        const showH2h = Boolean(h2h && !isForfeit && (m.played || h2h.matches.some((x) => x.id !== m.id)));
        // No team sheet yet: the season's regulars are the best guess at who will turn up.
        const usual = !m.played && season.id !== "FR" ? leaderboard(seasonPlayers(data, season.id), "apps").slice(0, 8) : [];
        // A forfeit's line-up is the bill: who was responsible, and what the pitch cost each of them.
        const lineupCard = isForfeit && m.played ? (
          <div className="card p-5">
            <SectionTitle sub={lineup.length ? `${lineup.length} responsible, ${fmtMoney(m.costPerPlayer)} each of the ${fmtMoney(m.matchCost)} pitch. Everyone else pays nothing for this one.` : "Nobody was charged for the pitch on this one."}>Paying for it</SectionTitle>
            {lineup.length > 0 && <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{lineup.map((l) => <li key={l.player} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/[0.05] px-3 py-1.5"><PlayerLink name={l.player} player={byName.get(l.player)} avatar className="min-w-0 truncate text-sm" /><span className="tabular shrink-0 text-xs text-gold">{fmtMoney(l.cost)}</span></li>)}</ul>}
            <p className="mt-4 text-xs text-ash">Wrong people? <Link href={`/submit?match=${m.id}`} className="link">Amend the forfeit →</Link></p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className={clsx("p-5", (lineup.length || usual.length) ? "pb-2" : "")}><SectionTitle sub={m.played ? (lineup.length ? "Who turned up, and what they did about it" : "No appearance marks recorded for this one") : "Squad TBC. As is our attendance."}>Line-up</SectionTitle></div>
            {!m.played && usual.length > 0 && (
              <div className="px-5 pb-5">
                <p className="eyebrow mb-2">Usual suspects · {season.id} appearances</p>
                <LeaderList items={usual} color="bg-cream" />
                <p className="mt-3 text-xs text-ash">Played? <Link href={`/submit?match=${m.id}`} className="link">Submit the score →</Link></p>
              </div>
            )}
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
        );
        // Before kick-off the admin's team sheet stands in for the line-up; the score form starts from the same list.
        const squadCard = squad && squad.players.length > 0 ? (
          <section className="card p-5" aria-labelledby="expected-squad">
            <SectionTitle id="expected-squad" sub={`${squad.players.length} named by the admin. Subject to who actually turns up.`}>Expected squad</SectionTitle>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{squad.players.map((p) => <li key={p} className="flex min-w-0 items-center rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5"><PlayerLink name={p} player={byName.get(p)} avatar className="min-w-0 truncate text-sm" /></li>)}</ul>
            {squad.note && <p className="mt-4 border-l-2 border-mint pl-3 text-sm text-cream/90">{squad.note}</p>}
            <p className="mt-4 text-xs text-ash">Played? <Link href={`/submit?match=${m.id}`} className="link">Submit the score →</Link> and this list is ticked for you.</p>
          </section>
        ) : null;
        const h2hCard = showH2h && h2h ? (
          <div key="h2h" className="card p-5">
            <SectionTitle sub={`${h2h.played} meeting${h2h.played === 1 ? "" : "s"} across ${h2h.seasons.join(", ")}`}>Head to head</SectionTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {([["Won", h2h.won, "text-mint-soft"], ["Drawn", h2h.drawn, "text-draw-soft"], ["Lost", h2h.lost, "text-loss-soft"]] as [string, number, string][]).map(([k, v, c]) => <div key={k} className="flex flex-col-reverse"><dt className="eyebrow mt-1">{k}</dt><dd className={clsx("display text-3xl leading-none", c)}>{v}</dd></div>)}
            </dl>
            <p className="mt-2 text-center text-xs text-ash">Goals {h2h.gf}–{h2h.ga}</p>
            {h2h.matches.filter((x) => x.id !== m.id).length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {[...h2h.matches].filter((x) => x.id !== m.id).reverse().map((x) => <li key={x.id} className="flex items-center gap-2"><ResultPill result={x.result} size="sm" /><Link href={`/matches/${x.id}`} className="link">{scoreline(x)}</Link><span className="ml-auto text-xs text-ash">{x.seasonId} · {fmtDate(x.date)}</span></li>)}
              </ul>
            )}
          </div>
        ) : null;
        if (m.played || !showPreview) {
          const side = [m.played && (
            <div key="summary" className="card p-5">
              <SectionTitle>Summary</SectionTitle>
              <dl className="space-y-3 text-sm">
                {isForfeit ? <div><dt className="eyebrow">Forfeit</dt><dd className="mt-1 text-cream">Awarded {m.ourGoals}–{m.theirGoals}. Not counted for records, but the pitch was still paid for.</dd></div> : (
                <div><dt className="eyebrow">Scorers</dt><dd className="mt-1 text-cream">{scorers.length ? scorers.map((s) => `${s.player}${s.goals > 1 ? ` ×${s.goals}` : ""}`).join(", ") : (m.ourGoals ?? 0) > 0 ? "Goals recorded, scorers lost to history" : "Nobody. Not one."}</dd></div>
                )}
                {!isForfeit && <div><dt className="eyebrow">Assists</dt><dd className="mt-1 text-cream">{assisters.length ? assisters.map((s) => `${s.player}${s.assists > 1 ? ` ×${s.assists}` : ""}`).join(", ") : "None claimed, remarkably"}</dd></div>}
                <div><dt className="eyebrow">Verdict</dt><dd className="mt-1 text-cream">{verdict}</dd></div>
                {poll && (
                  <div>
                    <dt className="eyebrow">Man of the match vote</dt>
                    <dd className="mt-1 text-cream">
                      {poll.status === "open" ? <>Open. {poll.voted} of {poll.ballots} ballot{poll.ballots === 1 ? "" : "s"} in; closes {fmtCloses(poll.closesAt)} or once everyone has voted. Ballots went out by email to everyone who played.</>
                        : poll.winner ? <>{poll.winner} with {poll.counts?.[0]?.votes ?? 0} of {poll.voted} vote{poll.voted === 1 ? "" : "s"} · {poll.voted}/{poll.ballots} ballots came back{poll.closedBy === "everyone voted" ? ", closed early" : poll.closedBy === "deadline" ? ", closed on time" : `, closed by ${poll.closedBy}`}.</>
                        : <>Closed with no votes. {m.motm ? `${m.motm} stands, as recorded with the score.` : "No award this week."}</>}
                      {poll.counts && poll.counts.some((c) => c.votes > 0) && <span className="mt-1 block text-xs text-ash">{poll.counts.filter((c) => c.votes > 0).map((c) => `${c.player} ${c.votes}`).join(" · ")}</span>}
                      {poll.noVote.length > 0 && <span className="mt-1 block text-xs text-ash">No ballot for {poll.noVote.join(", ")}: no email on the members list.</span>}
                    </dd>
                  </div>
                )}
                {!m.scorersRecorded && (m.ourGoals ?? 0) > 0 && <div><dt className="eyebrow">Note</dt><dd className="mt-1 text-ash">Scorers weren&apos;t logged, so this game doesn&apos;t count towards anyone&apos;s goals-per-game.</dd></div>}
              </dl>
            </div>
          ), h2hCard].filter(Boolean);
          return (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
              <div className={side.length ? "lg:col-span-3" : "lg:col-span-5"}>{lineupCard}</div>
              {side.length > 0 && <div className="space-y-6 lg:col-span-2">{side}</div>}
            </section>
          );
        }
        // Still to play: the team sheet (or the shrug) and the history on the left, the forecast with room to breathe on the right.
        return (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
            <div className="space-y-6 lg:col-span-2">{squadCard ?? lineupCard}{h2hCard}</div>
            <div className="lg:col-span-3"><MatchPreview data={data} match={m} /></div>
          </section>
        );
      })()}

      <nav className="grid grid-cols-2 gap-3" aria-label="Adjacent matches">
        {prev ? <Link href={`/matches/${prev.id}`} className="focus-ring card flex min-w-0 items-center gap-2 p-3 transition-colors hover:border-white/20 sm:gap-3 sm:p-4"><ChevronLeft className="shrink-0" aria-hidden /><span className="min-w-0"><span className="eyebrow block">Previous</span><span className="block truncate text-sm text-cream"><span className="hidden sm:inline">{scoreline(prev)} vs </span>{prev.opponent}</span><span className="block text-xs text-ash">{fmtDate(prev.date)}</span></span></Link> : <span />}
        {next ? <Link href={`/matches/${next.id}`} className="focus-ring card flex min-w-0 items-center justify-end gap-2 p-3 text-right transition-colors hover:border-white/20 sm:gap-3 sm:p-4"><span className="min-w-0"><span className="eyebrow block">Next</span><span className="block truncate text-sm text-cream"><span className="hidden sm:inline">{next.played ? scoreline(next) : next.kickOff ?? "TBC"} vs </span>{next.opponent}</span><span className="block text-xs text-ash">{fmtDate(next.date)}</span></span><ChevronRight className="shrink-0" aria-hidden /></Link> : <span />}
      </nav>
    </div>
    </PageTransition>
  );
}
