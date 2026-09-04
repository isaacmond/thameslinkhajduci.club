"use client";
import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { inputClass, Select } from "./controls";
import { BoardPreview } from "./board-preview";
import { SubmissionResult, type SubmitResult } from "./submission-result";

export type PayablePlayer = { name: string; balance: number | null };
const money = (n: number) => `£${n.toFixed(2)}`;
const optionLabel = (p: PayablePlayer) => p.balance === null ? p.name : p.balance > 0.01 ? `${p.name} · owes ${money(p.balance)}` : p.balance < -0.01 ? `${p.name} · ${money(-p.balance)} in credit` : `${p.name} · settled`;
const shortDate = (iso: string) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBC");

export function PaymentForm({ players, payer, initialPlayer, today }: { players: PayablePlayer[]; payer: string | null; initialPlayer?: string; today: string }) {
  const start = players.find((p) => p.name === initialPlayer) ?? players.find((p) => (p.balance ?? 0) > 0.01) ?? players[0];
  const [player, setPlayer] = useState(start?.name ?? "");
  const [to, setTo] = useState(payer ?? "");
  const [amount, setAmount] = useState(start && (start.balance ?? 0) > 0.01 ? start.balance!.toFixed(2) : "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [who, setWho] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const balance = players.find((p) => p.name === player)?.balance ?? null;
  const amt = Number(amount);
  const pick = (name: string) => { setPlayer(name); setResult(null); const b = players.find((p) => p.name === name)?.balance ?? 0; setAmount(b > 0.01 ? b.toFixed(2) : ""); };

  const problems: string[] = [];
  if (!player) problems.push("Pick a player.");
  if (!to) problems.push("Say who was paid.");
  else if (to === player) problems.push("Paying yourself does not count.");
  if (!amount.trim() || !Number.isFinite(amt) || amt < 0.01) problems.push("Enter the amount you paid.");
  else if (amt > 500) problems.push("That is more than anyone owes. Check the amount.");
  if (!date) problems.push("Pick the date you paid."); else if (date > today) problems.push("That date is in the future.");
  if (who.trim().length < 2) problems.push("Add your name.");
  const canSubmit = problems.length === 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "payment", player, to, amount: Math.round(amt * 100) / 100, date, note, submittedBy: who, website }) });
      setResult((await r.json()) as SubmitResult);
    } catch { setResult({ ok: false, error: "Couldn't reach the server. Try again." }); }
    setBusy(false);
  };

  if (result?.ok) {
    const left = balance === null ? null : Math.round((balance - amt) * 100) / 100;
    return (
      <SubmissionResult result={result} onEdit={() => setResult(null)}>
        <BoardPreview className="mt-4" time={shortDate(date)} label="Payment" destination={`${player} → ${to || payer || "the club"}`} status={left !== null && left <= 0.01 ? "Settled" : "Received"} shortStatus="Paid" tone="ok" caption={`${money(amt)}${left !== null && left > 0.01 ? ` · ${money(left)} still to pay` : ""} · pending the admin's tick`} />
      </SubmissionResult>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Select label="Who paid" value={player} onChange={pick} options={players.map((p) => ({ value: p.name, label: optionLabel(p) }))} className="min-w-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <Select label="Paid to" value={to} onChange={(v) => { setTo(v); setResult(null); }} options={[...(to ? [] : [{ value: "", label: "Pick who received it" }]), ...players.map((p) => ({ value: p.name, label: p.name === payer ? `${p.name} · booked this season's pitch` : p.name }))]} className="min-w-0" />
          <span className="min-h-[1.25rem] text-[11px] text-ash">{payer ? (to && to !== payer ? `${payer} booked the pitch this season; the admin will check who should be credited.` : `${payer} booked the pitch this season.`) : "Whoever booked the pitch."}</span>
        </div>
        <label className="flex flex-col gap-1 text-xs text-ash">
          <span className="eyebrow">Amount (£)</span>
          <span className="relative"><span className="display pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-ash">£</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" required className={`${inputClass} pl-7 tabular`} /></span>
          <span className="min-h-[1.25rem] text-[11px] text-ash">
            {balance !== null && balance > 0.01 ? <>On the sheet {player} owes {money(balance)}. <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="link">Settle up</button></> : balance !== null && balance < -0.01 ? `${player} is already ${money(-balance)} in credit. Log it anyway if money moved.` : "Nothing outstanding on the sheet. Log it anyway if money moved."}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          <span className="eyebrow">Date paid</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required className={`${inputClass} tabular`} />
          <span className="min-h-[1.25rem] text-[11px] text-ash">When the money left your account.</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Reference (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Bank reference, or which games it covers" className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Your name</span><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="Usually the same person" className={inputClass} /></label>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-5 py-3 font-semibold text-night transition-colors hover:bg-mint-soft disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} aria-hidden />{busy ? "Sending…" : "Log the payment"}</button>
        {problems.length > 0 && <p className="text-xs text-gold" role="status">{problems[0]}</p>}
        {result && !result.ok && <p className="text-xs text-[#ff9a9d]" role="alert">{result.error}</p>}
        <p className="ml-auto text-xs text-ash">Nothing is saved by this page. <Link href="/money" className="link">See the balances →</Link></p>
      </div>
    </form>
  );
}
