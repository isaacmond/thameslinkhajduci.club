import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import clsx from "clsx";
import { getData } from "@/lib/data";
import type { Match } from "@/lib/types";
import { attendance, chemistry, chronological, fmtDate, fmtMoney, goalContext, impact, leaderboard, type LeaderKey, playedMatches, playerStreaks, scoreline, seasonHref, signed } from "@/lib/stats";
import { playerInsights } from "@/lib/insights";
import { Avatar, Breadcrumb, FormStrip, MotmStar, Panel, PlayerLink, ResultPill, Stat, StatGrid, StatStrip, Tag } from "@/components/ui";
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
        <StatStrip size="lg" divided className="card" items={[{ label: <><span className="sm:hidden">Apps</span><span className="hidden sm:inline">Appearances</span></>, value: p.apps }, { label: "Goals", value: p.goals }, { label: "Assists", value: p.assists }, { label: "Won", value: `${Math.round(p.winRate)}%` }]} />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label="Goals a game" value={p.goalsPerGame.toFixed(2)} sub={`over ${p.gpgGames} match${p.gpgGames === 1 ? "" : "es"} with scorers recorded`} />
          <Stat size="sm" label="Assists a game" value={p.assistsPerGame.toFixed(2)} sub={`over ${p.apgGames} match${p.apgGames === 1 ? "" : "es"} with assists recorded`} />
          <Stat size="sm" label="Man of the match" value={p.motm} sub={bestSeason ? `Best season: ${bestSeason.goals} goals in Season ${bestSeason.seasonId.replace(/^S/, "")}` : undefined} />
          <Stat size="sm" label="Won, drawn, lost" value={`${p.wins}–${p.draws}–${p.losses}`} sub={`${(decided ? (p.wins * 3 + p.draws) / decided : 0).toFixed(2)} points a game`} />
        </div>
      </section>

      <Panel id="form-streaks" title="Form" sub={lastEight.length ? `The last ${lastEight.length === 1 ? "match" : `${lastEight.length} matches`} ${first} played, most recent first` : undefined}>
        <FormStrip matches={lastEight} />
        <StatGrid className="mt-5 grid-cols-2 gap-3 lg:grid-cols-4">
          {p.goals === 0 ? (
            <Stat variant="well" label="Goals" value={0} sub="No goals yet" />
          ) : st.scoringRun > 0 ? (
            <Stat variant="well" label="Scoring run" value={st.scoringRun} sub={`${st.scoringRun === 1 ? "match" : "matches in a row"} with a goal · best ${st.longestScoringRun}`} />
          ) : (
            <Stat variant="well" label="Since last goal" value={st.drought} sub={`${st.drought === 1 ? "match" : "matches"} · best scoring run ${st.longestScoringRun}`} />
          )}
          {showUnbeaten ? (
            <Stat variant="well" label="Unbeaten run" value={st.unbeatenRun} sub={`${st.unbeatenRun === 1 ? "match" : "matches"} without defeat`} />
          ) : (
            <Stat variant="well" label="Since last win" value={st.winlessRun} sub={st.lastWin ? <>{st.winlessRun === 1 ? "match" : "matches"} · <Link href={`/matches/${st.lastWin.id}`} className="link">{scoreline(st.lastWin)} v {st.lastWin.opponent}</Link></> : st.winlessRun > 0 ? "matches" : "No matches yet"} />
          )}
          <Stat variant="well" label="Attendance" value={att.possible ? `${att.pct}%` : "–"} sub={att.possible ? `${att.apps} of ${att.possible} matches` : "Not yet on a season squad"} />
          <Stat variant="well" label="Goals in wins" value={gc.inWins} sub={p.goals > 0 ? `${gc.inDraws} in draws · ${gc.inLosses} in defeats` : "No goals yet"} />
        </StatGrid>
        {notes.length > 0 && (
          <ul className="mt-5 space-y-1.5 border-t border-ink/8 pt-4 text-sm text-muted" aria-label="Notes">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </Panel>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="With and without" sub="How often the team wins with and without them" as="div">
            <StatGrid className="grid-cols-2 gap-3">
              <Stat variant="well" align="center" label={`With ${first}`} value={`${imp.winRateWith ?? "–"}%`} sub={<>won, from {imp.withGames} {imp.withGames === 1 ? "match" : "matches"}<span className="mt-0.5 block">Goal difference {imp.gdWith === null ? "–" : signed(imp.gdWith)} a game</span></>} />
              <Stat variant="well" align="center" label="Without" value={<span className="text-muted">{imp.winRateWithout ?? "–"}%</span>} sub={<>won, from {imp.withoutGames} {imp.withoutGames === 1 ? "match" : "matches"}<span className="mt-0.5 block">Goal difference {imp.gdWithout === null ? "–" : signed(imp.gdWithout)} a game</span></>} />
            </StatGrid>
            {delta !== null && imp.withGames >= 3 && imp.withoutGames >= 3 && (
              <p className="mt-3 text-sm text-muted">{Math.abs(delta) > 5 ? <>The team&apos;s win rate is {Math.abs(delta)} points {delta > 0 ? "higher" : "lower"} with {first} playing.</> : <>About the same either way.</>}</p>
            )}
          </Panel>
          <Panel title="Played most with" sub="Most matches together, and the win rate" as="div">
            {partners.length ? (
              <ul className="space-y-2 text-sm">
                {partners.map((x) => <li key={x.other} className="flex items-center gap-2"><PlayerLink name={x.other} player={byName.get(x.other)} avatar className="min-w-0 truncate" /><span className="ml-auto shrink-0 text-xs text-muted">{x.shared} {x.shared === 1 ? "match" : "matches"}</span><span className="tabular w-12 shrink-0 text-right font-semibold text-ink">{x.winRate}%</span></li>)}
              </ul>
            ) : <p className="text-sm text-muted">Not enough matches yet.</p>}
          </Panel>
        </div>
        <Panel title="Season by season" sub="Appearances, goals and assists" as="div" className="flex flex-col lg:col-span-3" bodyClassName="flex flex-1 flex-col">
          <div className="min-h-[240px] flex-1"><PlayerSeasonBars data={perSeason} height="100%" /></div>
        </Panel>
      </section>

      {(() => { const n = (hatTricks.length > 0 ? 1 : 0) + (motms.length > 0 ? 1 : 0) + (money && (money.totalCharged > 0 || money.paid > 0) ? 1 : 0); return n > 0 && (
        <section className={clsx("grid grid-cols-1 gap-6", n >= 2 && "md:grid-cols-2", n >= 3 && "lg:grid-cols-3")}>
          {hatTricks.length > 0 && <Panel title="Hat-tricks" as="div"><ul className="space-y-2 text-sm">{hatTricks.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">{mine(m)!.goals} v {m.opponent}</Link><span className="text-muted"> · {scoreline(m)} · <span className="nowrap">{fmtDate(m.date)}</span></span></li>)}</ul></Panel>}
          {motms.length > 0 && <Panel title="Man of the match" as="div"><ul className="space-y-2 text-sm">{motms.map((m) => <li key={m.id}><Link href={`/matches/${m.id}`} className="link">v {m.opponent}</Link><span className="text-muted"> · {scoreline(m)} · <span className="nowrap">{fmtDate(m.date)}</span></span></li>)}</ul></Panel>}
          {money && (money.totalCharged > 0 || money.paid > 0) && <Panel title="Pitch fees" sub="From Season 8" as="div"><StatStrip size="sm" money items={([["Charged", money.totalCharged], ["Paid", money.paid], [money.balance < -0.01 ? "Is owed" : "Owes", Math.abs(money.balance)]] as [string, number][]).map(([label, v]) => ({ label, value: fmtMoney(v) }))} /><p className="mt-2 text-xs text-muted">{money.balance > 0.01 ? <><Link href={`/submit?type=payment&player=${encodeURIComponent(p.name)}`} className="link">Record a payment</Link> · </> : money.balance < -0.01 ? `Paid ${fmtMoney(money.pitchCovered)} of pitch fees. ` : "All paid up. "}<Link href="/money" className="link">Money</Link></p></Panel>}
        </section>
      ); })()}

      <Panel flush title="Every match" sub={`${log.length} match${log.length === 1 ? "" : "es"}, most recent first`}>
        <div className="scroll-x overflow-x-auto">
          <table className="stats rows-first w-full sm:min-w-[640px]">
            <thead><tr><th>Opponent</th><th>Result</th><th className="num">Score</th><th className="num">Goals</th><th className="num">Assists</th><th className="hidden sm:table-cell">Date</th><th className="hidden sm:table-cell">Season</th><th className="hidden sm:table-cell"><span className="sr-only">Awards</span></th></tr></thead>
            <tbody>
              {log.map((m) => { const l = mine(m)!; return (
                <tr key={m.id}>
                  <td><Link href={`/matches/${m.id}`} title={m.opponent} className="link inline-flex max-w-[8.5rem] font-medium text-ink sm:max-w-none"><span className="truncate">{m.opponent}</span></Link><span className="block text-3xs text-muted sm:hidden">{fmtDate(m.date, { day: "numeric", month: "short", year: "2-digit" })}{m.motm === p.name && <MotmStar className="icon-inline ml-1" label="Man of the match" />}</span>{m.type && <Tag size="sm" className="ml-2 hidden sm:inline-flex">{m.type}</Tag>}</td>
                  <td><ResultPill result={m.result} size="sm" /></td>
                  <td className="num font-medium">{scoreline(m)}</td>
                  <td className={clsx("num", l.goals > 0 && "font-semibold")}>{l.goals || ""}</td>
                  <td className="num">{l.assists || ""}</td>
                  <td className="hidden text-muted sm:table-cell">{fmtDate(m.date)}</td>
                  <td className="hidden text-muted sm:table-cell"><Link href={seasonHref(m.seasonId)} className="link">{m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonId.replace(/^S/, "")}`}</Link></td>
                  <td className="hidden text-xs text-muted sm:table-cell">{m.motm === p.name && <span className="mr-2 inline-flex items-center gap-1 text-gold"><MotmStar />Man of the match</span>}{!l.played && "Scored without an appearance recorded"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
    </PageTransition>
  );
}
