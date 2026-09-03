import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, MapPin, PartyPopper, Star } from "lucide-react";
import { getData } from "@/lib/data";
import { assistersFor, chronological, fmtDate, fmtMoney, headToHead, opponentKey, scorersFor, scoreline } from "@/lib/stats";
import { Avatar, PlayerLink, ResultPill, SectionTitle, Tag } from "@/components/ui";
import { Countdown } from "@/components/board";
import { londonEpoch } from "@/lib/time";

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
  return { title, description: `${m.seasonId} GW${m.gw} · ${fmtDate(m.date)}${m.motm ? ` · MOTM ${m.motm}` : ""}` };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const m = data.matches.find((x) => x.id === id);
  if (!m) notFound();
  const season = data.seasons.find((s) => s.id === m.seasonId)!;
  const all = chronological(data.matches);
  const idx = all.findIndex((x) => x.id === m.id);
  const prev = idx > 0 ? all[idx - 1] : null, next = idx < all.length - 1 ? all[idx + 1] : null;
  const h2h = headToHead(data.matches).find((o) => o.key === opponentKey(m.opponent));
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const lineup = [...m.lineup].filter((l) => l.played).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
  const ghosts = m.lineup.filter((l) => !l.played && (l.goals || l.assists));
  const scorers = scorersFor(m), assisters = assistersFor(m);
  const isForfeit = /forfeit/i.test(m.type ?? "") || /^forfeit$/i.test(m.opponent);
  const kickoff = m.date && m.kickOff ? londonEpoch(m.date, m.kickOff) : null;

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-ash" aria-label="Breadcrumb"><Link href="/matches" className="link">Matches</Link> / <Link href={`/seasons/${season.id.toLowerCase()}`} className="link">Season {season.number}</Link> / Gameweek {m.gw}</nav>

      <section className="card-solid pitch relative overflow-hidden p-6 animate-rise sm:p-10">
        <div className={clsx("pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl", m.result === "W" ? "bg-mint/25" : m.result === "L" ? "bg-loss/15" : "bg-gold/15")} aria-hidden />
        <div className="relative">
          <p className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ash">
            <span className="eyebrow">{season.id} · GW{m.gw}</span>
            <span>{fmtDate(m.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{m.kickOff && ` · ${m.kickOff}`}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{season.venue}</span>
            {m.type && <Tag tone="gold">{m.type} · not counted</Tag>}
          </p>
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <h1 className="display text-4xl leading-none text-cream sm:text-right sm:text-6xl">Thameslink Hajduci</h1>
            <div className="flex flex-col items-center gap-2">
              {m.played ? <p className="display tabular text-7xl leading-none text-cream sm:text-8xl">{m.ourGoals}<span className="mx-2 text-ash">–</span>{m.theirGoals}</p> : <p className="display text-4xl text-ash sm:text-5xl">{m.kickOff ?? "TBC"}</p>}
              <ResultPill result={m.result} size="lg" />
            </div>
            <h2 className="display text-4xl leading-none text-cream sm:text-6xl">{isForfeit && m.opponent.toLowerCase() === "forfeit" ? "Nobody (forfeit)" : m.opponent}</h2>
          </div>
          {!m.played && kickoff && <p className="mt-6 text-center text-sm text-ash">Kick-off in <Countdown target={kickoff} className="display text-3xl text-gold" /></p>}
          {m.comment && <blockquote className="mt-6 border-l-2 border-gold/60 pl-4 text-lg italic text-cream/90">“{m.comment}”</blockquote>}
          <div className="mt-6 flex flex-wrap gap-2">
            {m.motm && <span className="chip border-gold/40 bg-gold/10 text-gold"><Star size={12} aria-hidden />MOTM <PlayerLink name={m.motm} player={byName.get(m.motm)} className="!text-gold" /></span>}
            {m.champagne && <span className="chip border-peach/40 bg-peach/10 text-peach"><PartyPopper size={12} aria-hidden />Champagne moment: <PlayerLink name={m.champagne} player={byName.get(m.champagne)} className="!text-peach" /></span>}
            {m.playersInGame > 0 && <Tag>{m.playersInGame} Hajduci on the pitch</Tag>}
            {m.matchCost > 0 && <Tag>Pitch {fmtMoney(m.matchCost)} · {fmtMoney(m.costPerPlayer)} each</Tag>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="card overflow-hidden lg:col-span-3">
          <div className="p-5 pb-2"><SectionTitle sub={m.played ? (lineup.length ? "Who turned up, and what they did about it" : "No appearance marks recorded for this one") : "Squad TBC. As is our attendance."}>Line-up</SectionTitle></div>
          {lineup.length > 0 && (
            <table className="stats">
              <thead><tr><th>Player</th><th className="num">Goals</th><th className="num">Assists</th><th></th></tr></thead>
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
          )}
        </div>
        <div className="space-y-6 lg:col-span-2">
          {m.played && (
            <div className="card p-5">
              <SectionTitle>Summary</SectionTitle>
              <dl className="space-y-3 text-sm">
                <div><dt className="eyebrow">Scorers</dt><dd className="mt-1 text-cream">{scorers.length ? scorers.map((s) => `${s.player}${s.goals > 1 ? ` ×${s.goals}` : ""}`).join(", ") : (m.ourGoals ?? 0) > 0 ? "Goals recorded, scorers lost to history" : "Nobody. Not one."}</dd></div>
                <div><dt className="eyebrow">Assists</dt><dd className="mt-1 text-cream">{assisters.length ? assisters.map((s) => `${s.player}${s.assists > 1 ? ` ×${s.assists}` : ""}`).join(", ") : "None claimed, remarkably"}</dd></div>
                <div><dt className="eyebrow">Verdict</dt><dd className="mt-1 text-cream">{m.type ? `${m.type}. Doesn't count, thankfully or otherwise.` : m.result === "W" ? "Three points. Drinks were had." : m.result === "D" ? "A point. Nobody knew how to feel." : (m.theirGoals ?? 0) - (m.ourGoals ?? 0) >= 5 ? "A pasting. We move on." : "Narrow. Unlucky. Robbed, probably."}</dd></div>
              </dl>
            </div>
          )}
          {h2h && !isForfeit && (
            <div className="card p-5">
              <SectionTitle sub={`${h2h.played} meeting${h2h.played === 1 ? "" : "s"} across ${h2h.seasons.join(", ")}`}>Head to head</SectionTitle>
              <dl className="grid grid-cols-3 gap-2 text-center"><div><dt className="eyebrow">Won</dt><dd className="display text-3xl text-mint-soft">{h2h.won}</dd></div><div><dt className="eyebrow">Drawn</dt><dd className="display text-3xl text-[#ffe27a]">{h2h.drawn}</dd></div><div><dt className="eyebrow">Lost</dt><dd className="display text-3xl text-[#ff9a9d]">{h2h.lost}</dd></div></dl>
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

      <nav className="flex items-stretch justify-between gap-3" aria-label="Adjacent matches">
        {prev ? <Link href={`/matches/${prev.id}`} className="focus-ring card flex flex-1 items-center gap-3 p-4 transition-colors hover:border-white/20"><ChevronLeft aria-hidden /><span className="min-w-0"><span className="eyebrow block">Previous</span><span className="block truncate text-sm text-cream">{scoreline(prev)} vs {prev.opponent}</span><span className="block text-xs text-ash">{fmtDate(prev.date)}</span></span></Link> : <span className="flex-1" />}
        {next ? <Link href={`/matches/${next.id}`} className="focus-ring card flex flex-1 items-center justify-end gap-3 p-4 text-right transition-colors hover:border-white/20"><span className="min-w-0"><span className="eyebrow block">Next</span><span className="block truncate text-sm text-cream">{next.played ? scoreline(next) : next.kickOff ?? "TBC"} vs {next.opponent}</span><span className="block text-xs text-ash">{fmtDate(next.date)}</span></span><ChevronRight aria-hidden /></Link> : <span className="flex-1" />}
      </nav>
      <div className="hidden"><Avatar name="" /></div>
    </div>
  );
}
