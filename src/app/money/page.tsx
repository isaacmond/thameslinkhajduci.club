import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Coins, Receipt } from "lucide-react";
import { getData } from "@/lib/data";
import { chronological, fmtDate, fmtMoney, scoreline } from "@/lib/stats";
import { Callout, PageHeader, PlayerLink, ResultPill, SectionTitle, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Money", description: "Who owes what for pitch hire. Season 8 onwards." };

export default async function MoneyPage() {
  const data = await getData();
  const paidSeasons = data.seasons.filter((s) => s.matches.some((m) => m.matchCost > 0));
  const rows = data.money.rows.filter((r) => r.totalCharged > 0.001 || r.paid > 0.001 || Math.abs(r.balance) > 0.001).sort((a, b) => b.balance - a.balance || a.player.localeCompare(b.player));
  const owed = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const charged = rows.reduce((s, r) => s + r.totalCharged, 0), paid = rows.reduce((s, r) => s + r.paid, 0);
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const games = chronological(paidSeasons.flatMap((s) => s.matches)).filter((m) => m.matchCost > 0);
  const played = games.filter((m) => m.played);
  const spent = played.reduce((s, m) => s + m.matchCost, 0);
  const committed = games.reduce((s, m) => s + m.matchCost, 0);
  const goals = played.reduce((s, m) => s + (m.ourGoals ?? 0), 0), wins = played.filter((m) => m.result === "W").length;
  const payers = Object.entries(data.money.paidBy);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="The treasury" title="Money" sub={<>Pitch hire, split between whoever turned up. Tracked from Season 8 onwards; everything before that is settled, forgiven or forgotten.{payers.length > 0 && <> Season{payers.length > 1 ? "s" : ""} {payers.map(([s, who]) => `${s} paid up front by ${who}`).join(", ")}.</>}</>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Totals">
        <Stat label="Outstanding" value={fmtMoney(owed)} tone={owed > 0.01 ? "loss" : "win"} sub={owed > 0.01 ? `${rows.filter((r) => r.balance > 0.01).length} player${rows.filter((r) => r.balance > 0.01).length === 1 ? "" : "s"} yet to pay` : "Everyone's square"} />
        <Stat label="Charged so far" value={fmtMoney(charged)} sub={`${fmtMoney(paid)} received`} />
        <Stat label="Pitch spend" value={fmtMoney(spent)} sub={`${played.length} game${played.length === 1 ? "" : "s"} played · ${fmtMoney(committed)} for the season`} />
        <Stat label="Cost per goal" value={goals ? fmtMoney(spent / goals) : "–"} sub={goals ? `${goals} goal${goals === 1 ? "" : "s"} bought` : "No goals to amortise"} />
        <Stat label="Cost per win" value={wins ? fmtMoney(spent / wins) : spent ? "∞" : "–"} tone={wins ? "default" : "loss"} sub={wins ? `${wins} win${wins === 1 ? "" : "s"}` : "Priceless, in the worst way"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="card overflow-hidden lg:col-span-3">
          <div className="p-5 pb-2"><SectionTitle sub="Live from the Money tab. Balances update when the treasurer does.">Who owes what</SectionTitle></div>
          {rows.length ? (
            <table className="stats">
              <thead><tr><th>Player</th>{paidSeasons.map((s) => <th key={s.id} className="num">{s.id}</th>)}<th className="num">Charged</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.player}>
                    <td><PlayerLink name={r.player} player={byName.get(r.player)} avatar /></td>
                    {paidSeasons.map((s) => <td key={s.id} className="num text-ash">{r.charges[s.id] ? fmtMoney(r.charges[s.id]) : ""}</td>)}
                    <td className="num">{fmtMoney(r.totalCharged)}</td>
                    <td className="num text-mint-soft">{fmtMoney(r.paid)}</td>
                    <td className={clsx("num display text-xl", r.balance > 0.01 ? "text-[#ff9a9d]" : r.balance < -0.01 ? "text-mint-soft" : "text-ash")}>{r.balance < -0.01 ? `${fmtMoney(-r.balance)} credit` : fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="px-5 pb-5 text-sm text-ash">Nobody has been charged for anything yet. Enjoy it while it lasts.</p>}
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <SectionTitle sub="Every transfer logged on the Payments tab">Payments received</SectionTitle>
            {data.money.payments.length ? (
              <ul className="space-y-2 text-sm">{[...data.money.payments].reverse().map((p, i) => <li key={i} className="flex items-center gap-2"><Receipt size={14} className="text-mint-soft" aria-hidden /><PlayerLink name={p.player} player={byName.get(p.player)} /><span className="ml-auto tabular text-cream">{fmtMoney(p.amount)}</span><span className="text-xs text-ash">{fmtDate(p.date)}</span></li>)}</ul>
            ) : <p className="text-sm text-ash">No transfers logged yet. The treasurer remains optimistic.</p>}
          </div>
          <Callout icon={<Coins size={18} />}>Charges are simply pitch cost ÷ players who played, per game. Pay the person who booked the pitch, then the sheet gets updated and this page follows within a minute. <Link href="/data" className="link">Export the money table</Link> if you want to argue about it in a spreadsheet of your own.</Callout>
        </div>
      </section>

      {games.length > 0 && (
        <section className="card overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle sub="Pitch cost split by attendance. Fewer players, bigger bill: an incentive scheme of sorts.">Game by game</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="stats min-w-[560px]">
              <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th className="num">Players</th><th className="num">Pitch</th><th className="num">Each</th></tr></thead>
              <tbody>{games.map((m) => <tr key={m.id} className={clsx(!m.played && "opacity-60")}><td className="text-ash">{fmtDate(m.date)}</td><td><Link href={`/matches/${m.id}`} className="link font-medium text-cream">{m.opponent}</Link></td><td><span className="flex items-center gap-2"><ResultPill result={m.result} size="sm" />{m.played && <span className="text-xs text-ash">{scoreline(m)}</span>}</span></td><td className="num">{m.played ? m.playersInGame : "–"}</td><td className="num">{fmtMoney(m.matchCost)}</td><td className="num">{m.played && m.costPerPlayer ? fmtMoney(m.costPerPlayer) : "–"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
