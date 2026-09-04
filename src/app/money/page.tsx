import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Coins, Receipt } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, scoreline } from "@/lib/stats";
import { Callout, PageHeader, PlayerLink, ResultPill, SectionTitle, Stat } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Money", description: "Who owes what for pitch hire. Season 8 onwards." };

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
    <div className="space-y-8">
      <PageHeader eyebrow="The treasury" title="Money" sub={<>Pitch hire, split between whoever turned up. Tracked from Season 8 onwards; everything before that is settled, forgiven or forgotten.{payers.length > 0 && <> {payers.map(([s, who]) => `Season ${s.replace(/^S/, "")} paid up front by ${who}`).join("; ")}.</>}</>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Totals">
        <div className="col-span-2 lg:col-span-1"><Stat label="Outstanding" value={fmtMoney(owed)} tone={owed > 0.01 ? "loss" : "win"} sub={owed > 0.01 ? `${debtors} player${debtors === 1 ? "" : "s"} yet to pay${creditors.length ? ` · owed to ${creditors.map((c) => c.player.split(" ")[0]).join(" & ")}` : ""}` : "Everyone's square"} size="lg" /></div>
        <Stat label="Charged so far" value={fmtMoney(charged)} sub={`${fmtMoney(received)} received in transfers`} />
        <Stat label="Pitch spend" value={fmtMoney(spent)} sub={creditors.length ? `paid by ${creditors.map((c) => c.player.split(" ")[0]).join(" & ")} · ${fmtMoney(committed)} committed` : `${played.length} game${played.length === 1 ? "" : "s"} · ${fmtMoney(committed)} committed`} />
        <div className="hidden sm:block"><Stat label="Cost per goal" value={goals ? fmtMoney(spent / goals) : "–"} sub={goals ? `${goals} goal${goals === 1 ? "" : "s"} bought` : "No goals to amortise"} /></div>
        <div className="hidden sm:block"><Stat label="Cost per win" value={wins ? fmtMoney(spent / wins) : spent ? "∞" : "–"} tone={wins ? "default" : "loss"} sub={wins ? `${wins} win${wins === 1 ? "" : "s"}` : "Priceless, in the worst way"} /></div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div className="card overflow-hidden lg:col-span-3">
          <div className="p-5 pb-2"><SectionTitle sub={creditors.length ? `${creditors.map((c) => c.player).join(" and ")} paid for the pitch and ${creditors.length === 1 ? "is" : "are"} owed ${fmtMoney(owedToPayers)}. Everyone else pays them their share.` : "Balances update when the treasurer does."}>Who owes what</SectionTitle></div>
          {rows.length ? (
            <div className="scroll-x overflow-x-auto">
              <table className="stats w-full">
                <thead><tr><th>Player</th>{paidSeasons.map((s) => <th key={s.id} className="num hidden sm:table-cell">{s.id}</th>)}<th className="num hidden sm:table-cell">Charged</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.player}>
                      <td><PlayerLink name={r.player} player={byName.get(r.player)} avatar /></td>
                      {paidSeasons.map((s) => <td key={s.id} className="num hidden text-ash sm:table-cell">{r.charges[s.id] ? fmtMoney(r.charges[s.id]) : ""}</td>)}
                      <td className="num hidden sm:table-cell">{fmtMoney(r.totalCharged)}</td>
                      <td className="num text-mint-soft" title={r.pitchCovered > 0 ? `includes ${fmtMoney(r.pitchCovered)} of pitch hire paid` : undefined}>{fmtMoney(r.paid)}{r.pitchCovered > 0 && <span className="block text-[10px] text-ash">incl. pitch {fmtMoney(r.pitchCovered)}</span>}</td>
                      <td className={clsx("num display text-2xl", r.balance > 0.01 ? "text-[#ff9a9d]" : r.balance < -0.01 ? "text-mint-soft" : "text-ash")}>{r.balance < -0.01 ? <>{fmtMoney(-r.balance)}<span className="block text-[10px] font-sans tracking-wider text-mint-soft/80">owed to them</span></> : r.balance > 0.01 ? <>{fmtMoney(r.balance)}<span className="block text-[10px] font-sans tracking-wider text-[#ff9a9d]/80">owes</span></> : "£0.00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="px-5 pb-5 text-sm text-ash">Nobody has been charged for anything yet. Enjoy it while it lasts.</p>}
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <SectionTitle sub="Every transfer the treasurer has logged">Payments received</SectionTitle>
            {data.money.payments.length ? (
              <ul className="space-y-2 text-sm">{[...data.money.payments].reverse().map((p, i) => <li key={i} className="flex items-center gap-2"><Receipt size={14} className="text-mint-soft" aria-hidden /><PlayerLink name={p.player} player={byName.get(p.player)} /><span className="ml-auto tabular text-cream">{fmtMoney(p.amount)}</span><span className="text-xs text-ash">{fmtDate(p.date)}</span></li>)}</ul>
            ) : <p className="text-sm text-ash">No transfers logged yet. The treasurer remains optimistic.</p>}
          </div>
          <Callout icon={<Coins size={18} />}>Charges are simply pitch cost ÷ players who played, per game. Whoever paid for the pitch is credited the full cost, so their balance goes negative: that is money owed to them. Pay them, the treasurer logs it, and this page follows within a minute. <Link href="/data" className="link">Export the money table</Link> if you want to argue about it in a spreadsheet of your own.</Callout>
        </div>
      </section>

      {games.length > 0 && (
        <section className="card overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle sub="Pitch cost split by attendance. Fewer players, bigger bill: an incentive scheme of sorts.">Game by game</SectionTitle></div>
          <div className="scroll-x overflow-x-auto">
            <table className="stats min-w-[560px]">
              <thead><tr><th>Opponent</th><th>Result</th><th className="num">Players</th><th className="num">Pitch</th><th className="num">Each</th><th>Date</th></tr></thead>
              <tbody>
                {[...played, ...future.slice(0, 1)].map((m) => <tr key={m.id} className={clsx(!m.played && "opacity-70")}><td><Link href={`/matches/${m.id}`} className="link font-medium text-cream">{m.opponent}</Link>{!m.played && <span className="chip ml-2 text-ash">Next</span>}</td><td><span className="flex items-center gap-2"><ResultPill result={m.result} size="sm" />{m.played && <span className="text-xs text-ash">{scoreline(m)}</span>}</span></td><td className="num">{m.played ? m.playersInGame : "–"}</td><td className="num">{fmtMoney(m.matchCost)}</td><td className="num">{m.played && m.costPerPlayer ? fmtMoney(m.costPerPlayer) : "–"}</td><td className="text-ash">{fmtDate(m.date)}</td></tr>)}
              </tbody>
            </table>
          </div>
          {future.length > 1 && (
            <details className="border-t border-white/10">
              <summary className="focus-ring cursor-pointer px-4 py-3 text-sm text-ash hover:text-cream">{future.length - 1} more fixture{future.length - 1 === 1 ? "" : "s"} to come · {fmtMoney(future.slice(1).reduce((s, m) => s + m.matchCost, 0))} still to find · attendance TBC</summary>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 pb-4 text-sm text-ash sm:grid-cols-2 lg:grid-cols-3">{future.slice(1).map((m) => <li key={m.id} className="flex justify-between gap-3"><Link href={`/matches/${m.id}`} className="truncate hover:text-cream">{m.opponent}</Link><span className="shrink-0">{fmtDate(m.date, { day: "numeric", month: "short" })} · {fmtMoney(m.matchCost)}</span></li>)}</ul>
            </details>
          )}
        </section>
      )}
    </div>
    </PageTransition>
  );
}
