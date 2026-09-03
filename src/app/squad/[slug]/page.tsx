import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { Crown, Medal, PartyPopper, Sparkles, Star } from "lucide-react";
import { getData } from "@/lib/data";
import { canonicalName } from "@/lib/sheet";
import type { Match } from "@/lib/types";
import { chemistry, chronological, fmtDate, fmtMoney, impact, leaderboard, type LeaderKey, scoreline } from "@/lib/stats";
import { Avatar, PlayerLink, ResultPill, SectionTitle, Stat, Tag } from "@/components/ui";
import { PlayerSeasonBars } from "@/components/charts";

export async function generateStaticParams() {
  const data = await getData();
  return data.players.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  if (!p) notFound();
  return { title: p.name, description: `${p.name}: ${p.apps} apps, ${p.goals} goals, ${p.assists} assists for Thameslink Hajduci.`, openGraph: p.extra.photo ? { images: [p.extra.photo] } : undefined };
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
  const champagne = data.matches.filter((m) => m.countsForRecords && m.champagne && canonicalName(m.champagne) === p.name);
  const perSeason = data.seasons.map((s) => { const x = p.seasons.find((y) => y.seasonId === s.id); return { name: s.id, apps: x?.apps ?? 0, goals: x?.goals ?? 0, assists: x?.assists ?? 0 }; });
  const money = data.money.rows.find((r) => r.player === p.name);
  const current = data.seasons.find((s) => s.isCurrent);
  const thisSeason = current ? p.seasons.find((x) => x.seasonId === current.id) : undefined;
  const bestSeason = [...p.seasons].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals || b.apps - a.apps)[0];
  const byName = new Map(data.players.map((x) => [x.name, x]));
  const delta = imp.winRateWith !== null && imp.winRateWithout !== null ? imp.winRateWith - imp.winRateWithout : null;
  const decided = p.wins + p.draws + p.losses;

  return (
    <div className="space-y-8">
      <nav className="text-xs text-ash" aria-label="Breadcrumb"><Link href="/squad" className="link">Squad</Link> / {p.name}</nav>
      <header className="card-solid pitch relative overflow-hidden p-6 animate-rise sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-mint/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={p.name} photo={p.extra.photo} size={140} shirt={p.extra.shirt} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{p.extra.positions?.length ? p.extra.positions.join(" / ") : "Utility"}{thisSeason?.apps && current ? ` · Season ${current.number} squad` : ""}</p>
            <h1 className="display text-5xl leading-none text-cream sm:text-7xl">{p.name}</h1>
            {p.extra.nickname && <p className="mt-1 text-lg italic text-ash">“{p.extra.nickname}”</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag>Debut {fmtDate(p.debut)}</Tag>
              <Tag>Last seen {fmtDate(p.lastPlayed)}</Tag>
              <Tag>{p.seasons.filter((s) => s.apps > 0).length} season{p.seasons.filter((s) => s.apps > 0).length === 1 ? "" : "s"}</Tag>
              {ranks.map((r) => <Tag key={r.label} tone="gold"><Crown size={12} aria-hidden />#{r.rank} all-time {r.label}</Tag>)}
            </div>
            {p.extra.bio && <p className="mt-3 max-w-2xl text-sm text-ash">{p.extra.bio}</p>}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Career totals">
        <Stat label="Appearances" value={p.apps} sub={thisSeason ? `${thisSeason.apps} this season` : undefined} />
        <Stat label="Goals" value={p.goals} tone="win" sub={bestSeason ? `Best: ${bestSeason.goals} in ${bestSeason.seasonId}` : "Still waiting"} />
        <Stat label="Assists" value={p.assists} sub="Claimed, not verified" />
        <Stat label="Goals per game" value={p.goalsPerGame.toFixed(2)} />
        <Stat label="Man of the match" value={p.motm} tone="gold" />
        <Stat label="Champagne moments" value={p.champagne} sub="Not a compliment" />
        <Stat label="Win rate" value={`${p.winRate}%`} tone={p.winRate >= 50 ? "win" : p.winRate >= 25 ? "draw" : "loss"} sub={`W${p.wins} D${p.draws} L${p.losses}`} />
        <Stat label="Points per game" value={(decided ? (p.wins * 3 + p.draws) / decided : 0).toFixed(2)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <SectionTitle sub="Appearances, goals and assists per season">Season by season</SectionTitle>
          <PlayerSeasonBars data={perSeason} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <SectionTitle sub="Team win rate with and without them on the pitch">Impact</SectionTitle>
            <dl className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.04] p-3"><dt className="eyebrow">With</dt><dd className="display tabular text-4xl text-mint-soft">{imp.winRateWith ?? "–"}%</dd><dd className="text-xs text-ash">{imp.withGames} games · GD {imp.gdWith ?? "–"}/game</dd></div>
              <div className="rounded-xl bg-white/[0.04] p-3"><dt className="eyebrow">Without</dt><dd className="display tabular text-4xl text-ash">{imp.winRateWithout ?? "–"}%</dd><dd className="text-xs text-ash">{imp.withoutGames} games · GD {imp.gdWithout ?? "–"}/game</dd></div>
            </dl>
            {delta !== null && imp.withGames >= 3 && imp.withoutGames >= 3 && (
              <p className="mt-3 text-sm text-ash">{delta > 5 ? <>Hajduci win <span className="text-mint-soft">{delta} points</span> more often with {p.name.split(" ")[0]} playing. Statistically significant? Absolutely not. Emotionally? Yes.</> : delta < -5 ? <>The team wins <span className="text-[#ff9a9d]">{Math.abs(delta)} points</span> more often without {p.name.split(" ")[0]}. We&apos;re sure it&apos;s a coincidence.</> : <>No measurable difference either way. The very definition of a squad player.</>}</p>
            )}
          </div>
          <div className="card p-5">
            <SectionTitle sub="Most shared appearances">Partners in crime</SectionTitle>
            {partners.length ? (
              <ul className="space-y-2 text-sm">
                {partners.map((x) => <li key={x.other} className="flex items-center gap-2"><PlayerLink name={x.other} player={byName.get(x.other)} avatar /><span className="ml-auto text-xs text-ash">{x.shared} games together</span><span className={clsx("tabular w-12 text-right font-semibold", x.winRate >= 40 ? "text-mint-soft" : "text-ash")}>{x.winRate}%</span></li>)}
              </ul>
            ) : <p className="text-sm text-ash">Hasn&apos;t shared a pitch with anyone twice. A lone wolf.</p>}
          </div>
        </div>
      </section>

      {(hatTricks.length > 0 || motms.length > 0 || champagne.length > 0 || (money && (money.totalCharged > 0 || money.paid > 0))) && (
        <section className="grid gap-6 md:grid-cols-3">
          {hatTricks.length > 0 && <div className="card p-5"><SectionTitle><span className="inline-flex items-center gap-2"><Sparkles size={20} className="text-gold" aria-hidden />Hat-tricks</span></SectionTitle><ul className="space-y-2 text-sm">{hatTricks.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">{mine(m)!.goals} vs {m.opponent}</Link><span className="text-ash"> · {scoreline(m)} · {fmtDate(m.date)}</span></li>)}</ul></div>}
          {motms.length > 0 && <div className="card p-5"><SectionTitle><span className="inline-flex items-center gap-2"><Medal size={20} className="text-gold" aria-hidden />Man of the match</span></SectionTitle><ul className="space-y-2 text-sm">{motms.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">vs {m.opponent}</Link><span className="text-ash"> · {scoreline(m)} · {fmtDate(m.date)}</span></li>)}</ul></div>}
          {champagne.length > 0 && <div className="card p-5"><SectionTitle sub="Moments of, let's say, distinction"><span className="inline-flex items-center gap-2"><PartyPopper size={20} className="text-peach" aria-hidden />Champagne moments</span></SectionTitle><ul className="space-y-2 text-sm">{champagne.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">vs {m.opponent}</Link><span className="text-ash"> · {fmtDate(m.date)}</span>{m.comment && <p className="italic text-cream/80">“{m.comment}”</p>}</li>)}</ul></div>}
          {money && (money.totalCharged > 0 || money.paid > 0) && <div className="card p-5"><SectionTitle sub="Season 8 onwards">Tab</SectionTitle><dl className="grid grid-cols-3 gap-2 text-center"><div><dt className="eyebrow">Charged</dt><dd className="display text-2xl text-cream">{fmtMoney(money.totalCharged)}</dd></div><div><dt className="eyebrow">Paid</dt><dd className="display text-2xl text-mint-soft">{fmtMoney(money.paid)}</dd></div><div><dt className="eyebrow">Owes</dt><dd className={clsx("display text-2xl", money.balance > 0.01 ? "text-[#ff9a9d]" : "text-mint-soft")}>{fmtMoney(money.balance)}</dd></div></dl><p className="mt-2 text-xs text-ash">{money.balance > 0.01 ? "The treasurer has been informed." : "Fully paid up. A model citizen."} <Link href="/money" className="link">Money →</Link></p></div>}
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="p-5 pb-3"><SectionTitle sub={`${log.length} game${log.length === 1 ? "" : "s"} on record, newest first`}>Match log</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="stats min-w-[640px]">
            <thead><tr><th>Date</th><th>Season</th><th>Opponent</th><th>Result</th><th className="num">Score</th><th className="num">G</th><th className="num">A</th><th>Notes</th></tr></thead>
            <tbody>
              {log.map((m) => { const l = mine(m)!; return (
                <tr key={m.id} className={clsx(!m.countsForRecords && "opacity-60")}>
                  <td className="text-ash">{fmtDate(m.date)}</td>
                  <td><Link href={`/seasons/${m.seasonId.toLowerCase()}`} className="link">{m.seasonId}</Link> <span className="text-ash">GW{m.gw}</span></td>
                  <td><Link href={`/matches/${m.id}`} className="link font-medium text-cream">{m.opponent}</Link>{m.type && <span className="chip ml-2 text-ash">{m.type}</span>}</td>
                  <td><ResultPill result={m.result} size="sm" /></td>
                  <td className="num display text-lg">{scoreline(m)}</td>
                  <td className={clsx("num", l.goals > 0 && "font-semibold text-mint-soft")}>{l.goals || ""}</td>
                  <td className="num">{l.assists || ""}</td>
                  <td className="text-xs text-ash">{m.motm === p.name && <span className="mr-2 inline-flex items-center gap-1 text-gold"><Star size={12} aria-hidden />MOTM</span>}{!l.played && "Scored without an appearance mark"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
