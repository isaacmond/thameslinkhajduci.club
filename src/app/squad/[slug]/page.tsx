import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import clsx from "clsx";
import { Crown, Medal, PartyPopper, Sparkles, Star } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import { chemistry, chronological, fmtDate, fmtMoney, impact, leaderboard, type LeaderKey, scoreline } from "@/lib/stats";
import { playerCaption } from "@/lib/captions";
import { Avatar, PlayerLink, ResultPill, SectionTitle, Stat, Tag } from "@/components/ui";
import { PlayerSeasonBars } from "@/components/charts";
import { ShareButton } from "@/components/share-button";
import { PageTransition } from "@/components/page-transition";

export async function generateStaticParams() {
  const data = await getData();
  return data.players.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  if (!p) notFound();
  return { title: p.name, description: `${p.name}: ${p.apps} apps, ${p.goals} goals, ${p.assists} assists for Thameslink Hajduci. ${playerCaption({ ...p, positions: p.extra.positions })}` };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  if (!p) notFound();
  const mine = (m: Match) => m.lineup.find((l) => l.player === p.name);
  const log = chronological(data.matches).filter((m) => { const l = mine(m); return l && (l.played || l.goals > 0 || l.assists > 0); }).reverse();
  const imp = impact(data, p.name);
  const partners = chemistry(data.matches, 2).filter((x) => x.a === p.name || x.b === p.name).slice(0, 6).map((x) => ({ ...x, other: x.a === p.name ? x.b : x.a }));
  const rankOf = (key: LeaderKey, minApps = 0) => { const i = leaderboard(data.players, key, minApps).findIndex((x) => x.player.name === p.name); return i >= 0 ? i + 1 : null; };
  const ranks = ([["goals", "scorer"], ["apps", "for appearances"], ["assists", "for assists"], ["motm", "for MOTM awards"], ["champagne", "for champagne moments"]] as [LeaderKey, string][]).map(([k, label]) => ({ label, rank: rankOf(k) })).filter((r) => r.rank && r.rank <= 5);
  const hatTricks = log.filter((m) => m.countsForRecords && (mine(m)?.goals ?? 0) >= 3);
  const motms = log.filter((m) => m.countsForRecords && m.motm === p.name);
  const champagne = data.matches.filter((m) => m.countsForRecords && m.champagne === p.name);
  const perSeason = data.seasons.map((s) => { const x = p.seasons.find((y) => y.seasonId === s.id); return { name: s.id, apps: x?.apps ?? 0, goals: x?.goals ?? 0, assists: x?.assists ?? 0 }; });
  const money = data.money.rows.find((r) => r.player === p.name);
  const current = data.seasons.find((s) => s.isCurrent);
  const thisSeason = current ? p.seasons.find((x) => x.seasonId === current.id) : undefined;
  const bestSeason = [...p.seasons].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals || b.apps - a.apps)[0];
  const byName = new Map(data.players.map((x) => [x.name, x]));
  const delta = imp.winRateWith !== null && imp.winRateWithout !== null ? imp.winRateWith - imp.winRateWithout : null;
  const decided = p.wins + p.draws + p.losses;
  const seasonsPlayed = p.seasons.filter((s) => s.apps > 0).length;
  const caption = p.extra.bio ?? playerCaption({ ...p, positions: p.extra.positions });
  const first = p.name.split(" ")[0];

  return (
    <PageTransition>
    <div className="space-y-8">
      <nav className="text-xs text-ash" aria-label="Breadcrumb"><Link href="/squad" className="link">Squad</Link> / {p.name}</nav>
      <header className="card-solid pitch relative overflow-hidden p-5 animate-rise sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-mint/15 blur-3xl" aria-hidden />
        {p.extra.shirt !== null && p.extra.shirt !== undefined && <span className="display pointer-events-none absolute -bottom-10 right-4 select-none text-[14rem] leading-none text-cream/[0.06] sm:text-[18rem]" aria-hidden>{p.extra.shirt}</span>}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <ViewTransition name={`player-${p.slug}`} share="morph" default="none"><Avatar name={p.name} photo={p.extra.photo} size={140} shirt={p.extra.shirt} priority /></ViewTransition>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{p.extra.positions?.length ? p.extra.positions.join(" / ") : "Utility"}{thisSeason?.apps && current ? ` · Season ${current.number} squad` : ""}</p>
            <h1 className="display text-5xl leading-none text-cream sm:text-7xl">{p.name}</h1>
            {p.extra.nickname && <p className="mt-1 text-lg italic text-ash">“{p.extra.nickname}”</p>}
            <p className="mt-3 max-w-2xl text-base italic text-cream/90 sm:text-lg">{caption}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Tag>Debut {fmtDate(p.debut)}</Tag>
              <Tag>Last seen {fmtDate(p.lastPlayed)}</Tag>
              <Tag>{seasonsPlayed} season{seasonsPlayed === 1 ? "" : "s"}</Tag>
              {ranks.map((r) => <Tag key={r.label} tone="gold"><Crown size={12} aria-hidden />#{r.rank} all-time {r.label}</Tag>)}
              <ShareButton title={`${p.name} · Thameslink Hajduci`} text={`${p.name}: ${p.apps} apps, ${p.goals} goals, ${p.assists} assists. ${caption}`} />
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Career totals">
        <dl className="card grid grid-cols-4 divide-x divide-white/10 text-center">
          {([["Apps", p.apps, "text-cream"], ["Goals", p.goals, "text-mint-soft"], ["Assists", p.assists, "text-cream"], ["Win %", `${Math.round(p.winRate)}`, p.winRate >= 50 ? "text-mint-soft" : p.winRate >= 25 ? "text-[#ffe27a]" : "text-[#ff9a9d]"]] as [string, number | string, string][]).map(([k, v, c]) => <div key={k} className="flex flex-col-reverse py-4"><dt className="eyebrow mt-1">{k}</dt><dd className={clsx("display tabular text-4xl leading-none sm:text-5xl", c)}>{v}</dd></div>)}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label="Goals per game" value={p.goalsPerGame.toFixed(2)} sub={`over ${p.gpgGames} game${p.gpgGames === 1 ? "" : "s"} with scorers logged`} />
          <Stat size="sm" label="Assists per game" value={p.assistsPerGame.toFixed(2)} sub={`over ${p.apgGames} game${p.apgGames === 1 ? "" : "s"} with assists logged`} />
          <Stat size="sm" label="Man of the match" value={p.motm} tone="gold" sub={bestSeason ? `Best season: ${bestSeason.goals} goals in ${bestSeason.seasonId}` : "Best season: pending"} />
          <Stat size="sm" label="Record" value={`${p.wins}-${p.draws}-${p.losses}`} sub={`${(decided ? (p.wins * 3 + p.draws) / decided : 0).toFixed(2)} pts/game · ${p.champagne} champagne moment${p.champagne === 1 ? "" : "s"}`} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <SectionTitle sub="Team win rate with and without them on the pitch">Impact</SectionTitle>
            <dl className="grid grid-cols-2 gap-3 text-center">
              <div className="flex flex-col-reverse rounded-xl bg-white/[0.04] p-3"><dt className="eyebrow">With {first}</dt><dd className="display tabular text-4xl text-mint-soft">{imp.winRateWith ?? "–"}%<span className="block text-xs font-sans text-ash">{imp.withGames} games · GD {imp.gdWith ?? "–"}/game</span></dd></div>
              <div className="flex flex-col-reverse rounded-xl bg-white/[0.04] p-3"><dt className="eyebrow">Without</dt><dd className="display tabular text-4xl text-ash">{imp.winRateWithout ?? "–"}%<span className="block text-xs font-sans text-ash">{imp.withoutGames} games · GD {imp.gdWithout ?? "–"}/game</span></dd></div>
            </dl>
            {delta !== null && imp.withGames >= 3 && imp.withoutGames >= 3 && (
              <p className="mt-3 text-sm text-ash">{delta > 5 ? <>Hajduci win <span className="text-mint-soft">{delta} points</span> more often with {first} playing. Statistically significant? Absolutely not. Emotionally? Yes.</> : delta < -5 ? <>The team wins <span className="text-[#ff9a9d]">{Math.abs(delta)} points</span> more often without {first}. We&apos;re sure it&apos;s a coincidence.</> : <>No measurable difference either way. The very definition of a squad player.</>}</p>
            )}
          </div>
          <div className="card p-5">
            <SectionTitle sub="Most shared appearances, and how it went">Partners in crime</SectionTitle>
            {partners.length ? (
              <ul className="space-y-2 text-sm">
                {partners.map((x) => <li key={x.other} className="flex items-center gap-2"><PlayerLink name={x.other} player={byName.get(x.other)} avatar className="min-w-0 truncate" /><span className="ml-auto shrink-0 text-xs text-ash">{x.shared} games</span><span className={clsx("tabular w-12 shrink-0 text-right font-semibold", x.winRate >= 40 ? "text-mint-soft" : "text-ash")}>{x.winRate}%</span></li>)}
              </ul>
            ) : <p className="text-sm text-ash">Hasn&apos;t shared a pitch with anyone twice. A lone wolf.</p>}
          </div>
        </div>
        <div className="card p-5 lg:col-span-3">
          <SectionTitle sub="Appearances (outline), goals and assists per season">Season by season</SectionTitle>
          <PlayerSeasonBars data={perSeason} />
        </div>
      </section>

      {(hatTricks.length > 0 || motms.length > 0 || champagne.length > 0 || (money && (money.totalCharged > 0 || money.paid > 0))) && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
          {hatTricks.length > 0 && <div className="card p-5"><SectionTitle><span className="inline-flex items-center gap-2"><Sparkles size={20} className="text-gold" aria-hidden />Hat-tricks</span></SectionTitle><ul className="space-y-2 text-sm">{hatTricks.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">{mine(m)!.goals} vs {m.opponent}</Link><span className="text-ash"> · {scoreline(m)} · {fmtDate(m.date)}</span></li>)}</ul></div>}
          {motms.length > 0 && <div className="card p-5"><SectionTitle><span className="inline-flex items-center gap-2"><Medal size={20} className="text-gold" aria-hidden />Man of the match</span></SectionTitle><ul className="space-y-2 text-sm">{motms.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">vs {m.opponent}</Link><span className="text-ash"> · {scoreline(m)} · {fmtDate(m.date)}</span></li>)}</ul></div>}
          {champagne.length > 0 && <div className="card p-5"><SectionTitle sub="Moments of, let's say, distinction"><span className="inline-flex items-center gap-2"><PartyPopper size={20} className="text-peach" aria-hidden />Champagne moments</span></SectionTitle><ul className="space-y-2 text-sm">{champagne.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">vs {m.opponent}</Link><span className="text-ash"> · {fmtDate(m.date)}</span>{m.comment && <p className="italic text-cream/80">“{m.comment}”</p>}</li>)}</ul></div>}
          {money && (money.totalCharged > 0 || money.paid > 0) && <div className="card p-5"><SectionTitle sub="Season 8 onwards">Tab</SectionTitle><dl className="grid grid-cols-3 gap-2 text-center"><div className="flex flex-col-reverse"><dt className="eyebrow">Charged</dt><dd className="display text-2xl text-cream">{fmtMoney(money.totalCharged)}</dd></div><div className="flex flex-col-reverse"><dt className="eyebrow">Paid</dt><dd className="display text-2xl text-mint-soft">{fmtMoney(money.paid)}</dd></div><div className="flex flex-col-reverse"><dt className="eyebrow">Owes</dt><dd className={clsx("display text-2xl", money.balance > 0.01 ? "text-[#ff9a9d]" : "text-mint-soft")}>{fmtMoney(money.balance)}</dd></div></dl><p className="mt-2 text-xs text-ash">{money.balance > 0.01 ? "The treasurer has been informed." : "Fully paid up. A model citizen."} <Link href="/money" className="link">Money →</Link></p></div>}
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="p-5 pb-3"><SectionTitle sub={`${log.length} game${log.length === 1 ? "" : "s"} on record, newest first`}>Match log</SectionTitle></div>
        <div className="scroll-x overflow-x-auto">
          <table className="stats min-w-[640px]">
            <thead><tr><th>Opponent</th><th>Result</th><th className="num">Score</th><th className="num">G</th><th className="num">A</th><th>Date</th><th>Season</th><th>Notes</th></tr></thead>
            <tbody>
              {log.map((m) => { const l = mine(m)!; return (
                <tr key={m.id} className={clsx(!m.countsForRecords && "opacity-60")}>
                  <td><Link href={`/matches/${m.id}`} className="link font-medium text-cream">{m.opponent}</Link>{m.type && <span className="chip ml-2 text-ash">{m.type}</span>}</td>
                  <td><ResultPill result={m.result} size="sm" /></td>
                  <td className="num display text-lg">{scoreline(m)}</td>
                  <td className={clsx("num", l.goals > 0 && "font-semibold text-mint-soft")}>{l.goals || ""}</td>
                  <td className="num">{l.assists || ""}</td>
                  <td className="text-ash">{fmtDate(m.date)}</td>
                  <td className="text-ash"><Link href={`/seasons/${m.seasonId.toLowerCase()}`} className="link">{m.seasonId}</Link> GW{m.gw}</td>
                  <td className="text-xs text-ash">{m.motm === p.name && <span className="mr-2 inline-flex items-center gap-1 text-gold"><Star size={12} aria-hidden />MOTM</span>}{!l.played && "Scored without an appearance mark"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
