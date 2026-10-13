import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import { attendance, chemistry, chronological, fmtDate, fmtMoney, goalContext, impact, leaderboard, type LeaderKey, playedMatches, playerStreaks, scoreline, seasonHref } from "@/lib/stats";
import { playerInsights } from "@/lib/insights";
import { Avatar, Breadcrumb, FormStrip, PlayerLink, ResultPill, SectionTitle, Stat, Tag } from "@/components/ui";
import { PlayerSeasonBars } from "@/components/charts";
import { ShareButton } from "@/components/share-button";
import { PageTransition } from "@/components/page-transition";
import { EditProfileLink } from "@/components/edit-profile-link";

export async function generateStaticParams() {
  const data = await getData();
  return data.players.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  if (!p) notFound();
  return { title: p.name, description: `${p.name}: ${p.apps} appearances, ${p.goals} goals and ${p.assists} assists for Thameslink Hajduci.` };
}

const ordinal = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`; };

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
  const ranks = ([["goals", "for goals"], ["apps", "for appearances"], ["assists", "for assists"], ["motm", "for man of the match"]] as [LeaderKey, string][]).map(([k, label]) => ({ label, rank: rankOf(k) })).filter((r) => r.rank && r.rank <= 5);
  const hatTricks = log.filter((m) => m.countsForRecords && (mine(m)?.goals ?? 0) >= 3);
  const motms = log.filter((m) => m.countsForRecords && m.motm === p.name);
  const perSeason = data.seasons.map((s) => { const x = p.seasons.find((y) => y.seasonId === s.id); return { name: s.id, apps: x?.apps ?? 0, goals: x?.goals ?? 0, assists: x?.assists ?? 0 }; });
  const money = data.money.rows.find((r) => r.player === p.name);
  const current = data.seasons.find((s) => s.isCurrent);
  const thisSeason = current ? p.seasons.find((x) => x.seasonId === current.id) : undefined;
  const bestSeason = [...p.seasons].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals || b.apps - a.apps)[0];
  const byName = new Map(data.players.map((x) => [x.name, x]));
  const delta = imp.winRateWith !== null && imp.winRateWithout !== null ? imp.winRateWith - imp.winRateWithout : null;
  const decided = p.wins + p.draws + p.losses;
  const seasonsPlayed = p.seasons.filter((s) => s.apps > 0).length;
  const first = p.name.split(" ")[0];
  const lastEight = chronological(playedMatches(data.matches)).filter((m) => m.lineup.some((l) => l.player === p.name && l.played)).slice(-8).reverse();
  const st = playerStreaks(data, p.name), gc = goalContext(data, p.name), att = attendance(data, p.name);
  const notes = playerInsights(data, p);
  const showUnbeaten = st.unbeatenRun > 0 && st.unbeatenRun >= st.winlessRun;

  return (
    <PageTransition>
    <div className="space-y-10">
      <Breadcrumb items={[{ href: "/squad", label: "Squad" }, { label: p.name }]} />
      <header className="grid gap-8 border-b border-ink/10 pb-6 animate-rise md:grid-cols-[auto_1fr] md:items-center md:gap-12">
        <ViewTransition name={`player-${p.slug}`} share="morph" default="none"><Avatar name={p.name} photo={p.extra.photo} size={176} shirt={p.extra.shirt} priority /></ViewTransition>
        <div className="min-w-0">
          <p className="eyebrow">{p.extra.positions?.length ? p.extra.positions.join(" · ") : "Squad player"}{p.extra.shirt !== null && p.extra.shirt !== undefined ? ` · Number ${p.extra.shirt}` : ""}</p>
          <h1 className="display mt-2 text-5xl leading-[0.95] text-ink sm:text-7xl">{p.name}</h1>
          {p.extra.nickname && <p className="display mt-2 text-2xl italic text-muted">“{p.extra.nickname}”</p>}
          {p.extra.bio && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink/85">{p.extra.bio}</p>}
          <p className="mt-4 text-sm text-muted">Debut {fmtDate(p.debut, { day: "numeric", month: "long", year: "numeric" })} · last played {fmtDate(p.lastPlayed, { day: "numeric", month: "long", year: "numeric" })} · {seasonsPlayed} season{seasonsPlayed === 1 ? "" : "s"}{thisSeason?.apps && current ? ` · in the Season ${current.number} squad` : ""}</p>
          {(p.ringer || ranks.length > 0) && <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {p.ringer && <Tag>Ringer · never on the team sheet</Tag>}
            {ranks.map((r) => <Tag key={r.label} tone="gold">{ordinal(r.rank!)} all time {r.label}</Tag>)}
          </div>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ShareButton title={`${p.name} · Thameslink Hajduci`} text={`${p.name}: ${p.apps} appearances, ${p.goals} goals and ${p.assists} assists for Thameslink Hajduci.`} />
            <EditProfileLink player={p.name} />
          </div>
        </div>
      </header>

      <section aria-label="Career totals">
        <dl className="card grid grid-cols-4 divide-x divide-ink/10 text-center">
          {([["Appearances", p.apps], ["Goals", p.goals], ["Assists", p.assists], ["Won", `${Math.round(p.winRate)}%`]] as [string, number | string][]).map(([k, v]) => <div key={k} className="flex flex-col-reverse py-5"><dt className="eyebrow mt-2">{k === "Appearances" ? <><span className="sm:hidden">Apps</span><span className="hidden sm:inline">Appearances</span></> : k}</dt><dd className="display text-4xl leading-none text-ink sm:text-5xl">{v}</dd></div>)}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label="Goals a game" value={p.goalsPerGame.toFixed(2)} sub={`over ${p.gpgGames} match${p.gpgGames === 1 ? "" : "es"} with scorers recorded`} />
          <Stat size="sm" label="Assists a game" value={p.assistsPerGame.toFixed(2)} sub={`over ${p.apgGames} match${p.apgGames === 1 ? "" : "es"} with assists recorded`} />
          <Stat size="sm" label="Man of the match" value={p.motm} sub={bestSeason ? `Best season: ${bestSeason.goals} goals in Season ${bestSeason.seasonId.replace(/^S/, "")}` : undefined} />
          <Stat size="sm" label="Won, drawn, lost" value={`${p.wins}–${p.draws}–${p.losses}`} sub={`${(decided ? (p.wins * 3 + p.draws) / decided : 0).toFixed(2)} points a game`} />
        </div>
      </section>

      <section className="card p-6" aria-labelledby="form-streaks">
        <SectionTitle id="form-streaks" sub={lastEight.length ? `The last ${lastEight.length === 1 ? "match" : `${lastEight.length} matches`} ${first} played, most recent first` : undefined}>Form</SectionTitle>
        <FormStrip matches={lastEight} />
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {p.goals === 0 ? (
            <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Goals</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">0</dd><dd className="mt-1.5 text-xs text-muted">No goals yet</dd></div>
          ) : st.scoringRun > 0 ? (
            <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Scoring run</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{st.scoringRun}</dd><dd className="mt-1.5 text-xs text-muted">{st.scoringRun === 1 ? "match" : "matches in a row"} with a goal · best {st.longestScoringRun}</dd></div>
          ) : (
            <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Since last goal</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{st.drought}</dd><dd className="mt-1.5 text-xs text-muted">{st.drought === 1 ? "match" : "matches"} · best scoring run {st.longestScoringRun}</dd></div>
          )}
          {showUnbeaten ? (
            <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Unbeaten run</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{st.unbeatenRun}</dd><dd className="mt-1.5 text-xs text-muted">{st.unbeatenRun === 1 ? "match" : "matches"} without defeat</dd></div>
          ) : (
            <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Since last win</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{st.winlessRun}</dd><dd className="mt-1.5 text-xs text-muted">{st.lastWin ? <>{st.winlessRun === 1 ? "match" : "matches"} · <Link href={`/matches/${st.lastWin.id}`} className="link">{scoreline(st.lastWin)} v {st.lastWin.opponent}</Link></> : st.winlessRun > 0 ? "matches" : "No matches yet"}</dd></div>
          )}
          <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Attendance</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{att.possible ? `${att.pct}%` : "–"}</dd><dd className="mt-1.5 text-xs text-muted">{att.possible ? `${att.apps} of ${att.possible} matches` : "Not yet on a season squad"}</dd></div>
          <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Goals in wins</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{gc.inWins}</dd><dd className="mt-1.5 text-xs text-muted">{p.goals > 0 ? `${gc.inDraws} in draws · ${gc.inLosses} in defeats` : "No goals yet"}</dd></div>
        </dl>
        {notes.length > 0 && (
          <ul className="mt-5 space-y-1.5 border-t border-ink/8 pt-4 text-sm text-muted" aria-label="Notes">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <SectionTitle sub="How often the team wins with and without them">With and without</SectionTitle>
            <dl className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">With {first}</dt><dd className="display mt-1.5 text-4xl leading-none text-ink">{imp.winRateWith ?? "–"}%</dd><dd className="mt-1.5 text-xs text-muted">won, from {imp.withGames} matches<span className="mt-0.5 block">Goal difference {imp.gdWith ?? "–"} a game</span></dd></div>
              <div className="rounded-xl bg-sunken/60 p-4"><dt className="eyebrow">Without</dt><dd className="display mt-1.5 text-4xl leading-none text-muted">{imp.winRateWithout ?? "–"}%</dd><dd className="mt-1.5 text-xs text-muted">won, from {imp.withoutGames} matches<span className="mt-0.5 block">Goal difference {imp.gdWithout ?? "–"} a game</span></dd></div>
            </dl>
            {delta !== null && imp.withGames >= 3 && imp.withoutGames >= 3 && (
              <p className="mt-3 text-sm text-muted">{Math.abs(delta) > 5 ? <>The team&apos;s win rate is {Math.abs(delta)} points {delta > 0 ? "higher" : "lower"} with {first} playing.</> : <>About the same either way.</>}</p>
            )}
          </div>
          <div className="card p-6">
            <SectionTitle sub="Most matches together, and the win rate">Played most with</SectionTitle>
            {partners.length ? (
              <ul className="space-y-2 text-sm">
                {partners.map((x) => <li key={x.other} className="flex items-center gap-2"><PlayerLink name={x.other} player={byName.get(x.other)} avatar className="min-w-0 truncate" /><span className="ml-auto shrink-0 text-xs text-muted">{x.shared} games</span><span className="tabular w-12 shrink-0 text-right font-semibold text-ink">{x.winRate}%</span></li>)}
              </ul>
            ) : <p className="text-sm text-muted">Not enough matches yet.</p>}
          </div>
        </div>
        <div className="card flex flex-col p-6 lg:col-span-3">
          <SectionTitle sub="Appearances, goals and assists">Season by season</SectionTitle>
          <div className="min-h-[240px] flex-1"><PlayerSeasonBars data={perSeason} height="100%" /></div>
        </div>
      </section>

      {(() => { const n = (hatTricks.length > 0 ? 1 : 0) + (motms.length > 0 ? 1 : 0) + (money && (money.totalCharged > 0 || money.paid > 0) ? 1 : 0); return n > 0 && (
        <section className={clsx("grid grid-cols-1 gap-6", n >= 2 && "md:grid-cols-2", n >= 3 && "lg:grid-cols-3")}>
          {hatTricks.length > 0 && <div className="card p-6"><SectionTitle>Hat-tricks</SectionTitle><ul className="space-y-2 text-sm">{hatTricks.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">{mine(m)!.goals} v {m.opponent}</Link><span className="text-muted"> · {scoreline(m)} · <span className="nowrap">{fmtDate(m.date)}</span></span></li>)}</ul></div>}
          {motms.length > 0 && <div className="card p-6"><SectionTitle>Man of the match</SectionTitle><ul className="space-y-2 text-sm">{motms.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">v {m.opponent}</Link><span className="text-muted"> · {scoreline(m)} · <span className="nowrap">{fmtDate(m.date)}</span></span></li>)}</ul></div>}
          {money && (money.totalCharged > 0 || money.paid > 0) && <div className="card p-6"><SectionTitle sub="From Season 8">Pitch fees</SectionTitle><dl className="grid grid-cols-3 gap-2 text-center"><div className="flex flex-col-reverse"><dt className="eyebrow mt-1">Charged</dt><dd className="tabular text-xl font-semibold text-ink">{fmtMoney(money.totalCharged)}</dd></div><div className="flex flex-col-reverse"><dt className="eyebrow mt-1">Paid</dt><dd className="tabular text-xl font-semibold text-ink">{fmtMoney(money.paid)}</dd></div><div className="flex flex-col-reverse"><dt className="eyebrow mt-1">{money.balance < -0.01 ? "Is owed" : "Owes"}</dt><dd className="tabular text-xl font-semibold text-ink">{fmtMoney(Math.abs(money.balance))}</dd></div></dl><p className="mt-2 text-xs text-muted">{money.balance > 0.01 ? <><Link href={`/submit?type=payment&player=${encodeURIComponent(p.name)}`} className="link">Record a payment</Link> · </> : money.balance < -0.01 ? `Paid ${fmtMoney(money.pitchCovered)} of pitch hire. ` : "All paid up. "}<Link href="/money" className="link">Money</Link></p></div>}
        </section>
      ); })()}

      <section className="card overflow-hidden">
        <div className="p-6 pb-2"><SectionTitle sub={`${log.length} match${log.length === 1 ? "" : "es"}, most recent first`}>Every match</SectionTitle></div>
        <div className="scroll-x overflow-x-auto">
          <table className="stats w-full sm:min-w-[640px]">
            <thead><tr><th>Opponent</th><th>Result</th><th className="num">Score</th><th className="num">Goals</th><th className="num">Assists</th><th className="hidden sm:table-cell">Date</th><th className="hidden sm:table-cell">Season</th><th className="hidden sm:table-cell"><span className="sr-only">Awards</span></th></tr></thead>
            <tbody>
              {log.map((m) => { const l = mine(m)!; return (
                <tr key={m.id}>
                  <td className="max-w-[8.5rem] sm:max-w-none"><Link href={`/matches/${m.id}`} className="link block truncate font-medium text-ink sm:inline">{m.opponent}</Link><span className="block text-[10px] text-muted sm:hidden">{fmtDate(m.date, { day: "numeric", month: "short", year: "2-digit" })}{m.motm === p.name && <span className="ml-1 text-gold">★</span>}</span>{m.type && <span className="chip ml-2 hidden !py-0 leading-5 text-muted sm:inline-flex">{m.type}</span>}</td>
                  <td><ResultPill result={m.result} size="sm" /></td>
                  <td className="num font-medium">{scoreline(m)}</td>
                  <td className={clsx("num", l.goals > 0 && "font-semibold")}>{l.goals || ""}</td>
                  <td className="num">{l.assists || ""}</td>
                  <td className="hidden text-muted sm:table-cell">{fmtDate(m.date)}</td>
                  <td className="hidden text-muted sm:table-cell"><Link href={seasonHref(m.seasonId)} className="link">{m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonId.replace(/^S/, "")}`}</Link></td>
                  <td className="hidden text-xs text-muted sm:table-cell">{m.motm === p.name && <span className="mr-2 inline-flex items-center gap-1 text-gold"><Star size={12} className="fill-current" aria-hidden />Man of the match</span>}{!l.played && "Scored without an appearance recorded"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
