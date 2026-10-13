import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Coins, Receipt } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, scoreline } from "@/lib/stats";
import { Callout, Empty, PageHeader, PlayerLink, ResultPill, SectionTitle, Stat } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";

export const metadata: Metadata = { title: "Money", description: "Pitch fees and balances for Thameslink Hajduci, from Season 8." };

export default async function MoneyPage() {
  const data = await getData();
  const paidSeasons = [...data.seasons, ...(data.friendlies ? [data.friendlies] : [])].filter((s) => s.matches.some((m) => m.matchCost > 0));
  const rows = data.money.rows.filter((r) => r.totalCharged > 0.001 || r.paid > 0.001 || Math.abs(r.balance) > 0.001).sort((a, b) => b.balance - a.balance || a.player.localeCompare(b.player));
  const owed = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const creditors = rows.filter((r) => r.balance < -0.01);
  const owedToPayers = creditors.reduce((s, r) => s - r.balance, 0);
  const charged = rows.reduce((s, r) => s + r.totalCharged, 0), received = rows.reduce((s, r) => s + Math.max(0, r.paid - r.pitchCovered), 0);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const games = chronological(paidSeasons.flatMap((s) => s.matches)).filter((m) => m.matchCost > 0);
  const played = games.filter((m) => m.played), future = games.filter((m) => !m.played);
  const spent = played.reduce((s, m) => s + m.matchCost, 0);
  const committed = games.reduce((s, m) => s + m.matchCost, 0);
  const goals = played.reduce((s, m) => s + (m.ourGoals ?? 0), 0), wins = played.filter((m) => m.result === "W").length;
  const payers = Object.entries(data.money.paidBy);
  const debtors = rows.filter((r) => r.balance > 0.01).length;

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Pitch fees" title="Money" sub={<>The cost of each pitch is shared between the players in that match. Balances are kept from Season 8.{payers.length > 0 && <> {payers.map(([s, who]) => `Season ${s.replace(/^S/, "")} was paid up front by ${who}`).join("; ")}.</>}</>} right={<Link href="/submit?type=payment" className={btn("primary")}><Coins size={16} aria-hidden />Record a payment</Link>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Totals">
        <div className="col-span-2 lg:col-span-1"><Stat money label="Outstanding" value={fmtMoney(owed)} sub={owed > 0.01 ? `${debtors} player${debtors === 1 ? "" : "s"} yet to pay${creditors.length ? ` · owed to ${creditors.map((c) => c.player.split(" ")[0]).join(" and ")}` : ""}` : "All settled"} size="lg" /></div>
        <Stat money label="Charged so far" value={fmtMoney(charged)} sub={`${fmtMoney(received)} paid`} />
        <Stat money label="Pitch spend" value={fmtMoney(spent)} sub={`${played.length} match${played.length === 1 ? "" : "es"} · ${fmtMoney(committed)} booked`} />
        <div className="hidden sm:block"><Stat money label="Per goal" value={goals ? fmtMoney(spent / goals) : "–"} sub={goals ? `${goals} goal${goals === 1 ? "" : "s"}` : undefined} /></div>
        <div className="hidden sm:block"><Stat money label="Per win" value={wins ? fmtMoney(spent / wins) : "–"} sub={wins ? `${wins} win${wins === 1 ? "" : "s"}` : undefined} /></div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card overflow-hidden lg:col-span-3">
          <div className="p-6 pb-2"><SectionTitle sub={creditors.length ? `${creditors.map((c) => c.player).join(" and ")} paid for the pitch and ${creditors.length === 1 ? "is" : "are"} owed ${fmtMoney(owedToPayers)}.` : undefined}>Balances</SectionTitle></div>
          {rows.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full">
                <thead><tr><th>Player</th>{paidSeasons.map((s) => <th key={s.id} className="num hidden sm:table-cell">{s.id}</th>)}<th className="num hidden sm:table-cell">Charged</th><th className="num hidden sm:table-cell">Paid</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.player}>
                      <td><PlayerLink name={r.player} player={byName.get(r.player)} avatar /></td>
                      {paidSeasons.map((s) => <td key={s.id} className="num hidden text-muted sm:table-cell">{r.charges[s.id] ? fmtMoney(r.charges[s.id]) : ""}</td>)}
                      <td className="num hidden sm:table-cell">{fmtMoney(r.totalCharged)}</td>
                      <td className="num hidden sm:table-cell" title={r.pitchCovered > 0 ? `includes ${fmtMoney(r.pitchCovered)} of pitch fees paid` : undefined}>{fmtMoney(r.paid)}{r.pitchCovered > 0 && <span className="block text-[10px] text-muted">incl. pitch {fmtMoney(r.pitchCovered)}</span>}</td>
                      <td className={clsx("num font-semibold", Math.abs(r.balance) <= 0.01 ? "text-muted" : "text-ink")}>{r.balance < -0.01 ? <>{fmtMoney(-r.balance)}<span className="block text-[10px] text-accent">owed to them</span></> : r.balance > 0.01 ? <>{fmtMoney(r.balance)}<span className="block text-[10px] text-loss">to pay</span></> : "£0.00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty inset>No charges yet.</Empty>}
        </div>
        <div className="lg:col-span-2 space-y-6 lg:flex lg:flex-col lg:space-y-0 lg:gap-6">
          <div className={clsx("card p-6", data.money.payments.length > 0 && "lg:flex-1")}>
            <SectionTitle>Payments</SectionTitle>
            {data.money.payments.length ? (
              <ul className="space-y-2 text-sm">{[...data.money.payments].reverse().map((p, i) => <li key={i} className="flex items-baseline gap-2"><Receipt size={14} className="self-center text-muted" aria-hidden /><PlayerLink name={p.player} player={byName.get(p.player)} />{p.to && <span className="truncate text-xs text-muted">→ <PlayerLink name={p.to} player={byName.get(p.to)} /></span>}<span className="ml-auto tabular text-ink">{fmtMoney(p.amount)}</span><span className="text-xs text-muted">{fmtDate(p.date)}</span></li>)}</ul>
            ) : <p className="text-sm text-muted">No payments recorded yet.</p>}
          </div>
          <Callout icon={<Coins size={18} />}>Each match costs the pitch fee divided by the players who played. A ringer pays nothing: their share is split between the regulars who weren&apos;t playing that night. Whoever paid for the pitch is credited the full cost, so they show as owed until everyone has paid them. <Link href="/data" className="link">Download the money table</Link>.</Callout>
        </div>
      </section>

      {games.length > 0 && (
        <section className="card overflow-hidden">
          <div className="p-6 pb-2"><SectionTitle sub="The pitch fee shared by the players in each match">Match by match</SectionTitle></div>
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full sm:min-w-[560px]">
              <thead><tr><th>Opponent</th><th className="hidden sm:table-cell">Result</th><th className="num">Players</th><th className="num">Pitch</th><th className="num">Each</th><th className="hidden sm:table-cell">Date</th></tr></thead>
              <tbody>
                {[...played, ...future.slice(0, 1)].map((m) => <tr key={m.id}><td><span className="flex items-center gap-2"><Link href={`/matches/${m.id}`} className="link block max-w-[7rem] truncate font-medium text-ink sm:max-w-none" title={m.opponent}>{m.opponent}</Link>{!m.played && <span className="chip hidden shrink-0 !py-0 leading-5 text-muted sm:inline-flex">Next</span>}</span>{!m.played && <span className="chip mt-1 !py-0 leading-5 text-muted sm:hidden">Next</span>}{m.played && <span className="mt-1 flex items-center gap-1.5 sm:hidden"><ResultPill result={m.result} size="sm" className="!h-5 !w-5 !text-[10px]" /><span className="tabular text-xs text-muted">{scoreline(m)}</span></span>}</td><td className="hidden sm:table-cell"><span className="flex items-center gap-2"><ResultPill result={m.result} size="sm" />{m.played && <span className="text-xs text-muted">{scoreline(m)}</span>}</span></td><td className="num">{m.played ? <>{m.playersInGame}{m.levy && <span className="block text-[10px] text-muted sm:ml-1 sm:inline"><span className="hidden sm:inline">· </span>{m.levy.ringers.length} ringer{m.levy.ringers.length === 1 ? "" : "s"}</span>}</> : "–"}</td><td className="num">{fmtMoney(m.matchCost)}</td><td className="num">{m.played && m.costPerPlayer ? fmtMoney(m.costPerPlayer) : "–"}</td><td className="hidden text-muted sm:table-cell">{fmtDate(m.date)}</td></tr>)}
              </tbody>
            </table>
          </div>
          {future.length > 1 && (
            <details className="border-t border-ink/10">
              <summary className="focus-ring cursor-pointer px-6 py-3 text-sm text-muted hover:text-ink">{future.length - 1} more fixture{future.length - 1 === 1 ? "" : "s"} booked · {fmtMoney(future.slice(1).reduce((s, m) => s + m.matchCost, 0))}</summary>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 pb-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">{future.slice(1).map((m) => <li key={m.id} className="flex justify-between gap-3"><Link href={`/matches/${m.id}`} className="focus-ring truncate rounded hover:text-ink">{m.opponent}</Link><span className="shrink-0">{fmtDate(m.date, { day: "numeric", month: "short" })} · {fmtMoney(m.matchCost)}</span></li>)}</ul>
            </details>
          )}
        </section>
      )}
    </div>
    </PageTransition>
  );
}
