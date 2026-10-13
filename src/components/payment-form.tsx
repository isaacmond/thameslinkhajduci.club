"use client";
import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { fmtMoney } from "@/lib/stats";
import { Field, FormStatus, inputClass, Select } from "./controls";
import { btn } from "./button";
import { SummaryCard } from "./summary-card";
import { SubmissionResult, type SubmitResult } from "./submission-result";
import { SignedInNote, type SignedIn } from "./signed-in-note";

export type PayablePlayer = { name: string; balance: number | null };
const optionLabel = (p: PayablePlayer) => p.balance === null ? p.name : p.balance > 0.01 ? `${p.name} · owes ${fmtMoney(p.balance)}` : p.balance < -0.01 ? `${p.name} · ${fmtMoney(-p.balance)} in credit` : `${p.name} · settled`;
const shortDate = (iso: string) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBC");

export function PaymentForm({ players, payer, initialPlayer, today, signedIn = null }: { players: PayablePlayer[]; payer: string | null; initialPlayer?: string; today: string; signedIn?: SignedIn | null }) {
  // Signed in and not the one who paid for the pitch? Then you are almost certainly logging your own payment.
  const start = players.find((p) => p.name === initialPlayer) ?? (signedIn && signedIn.player !== payer ? players.find((p) => p.name === signedIn.player) : undefined) ?? players.find((p) => (p.balance ?? 0) > 0.01) ?? players[0];
  const [player, setPlayer] = useState(start?.name ?? "");
  const [to, setTo] = useState(payer ?? "");
  const [amount, setAmount] = useState(start && (start.balance ?? 0) > 0.01 ? start.balance!.toFixed(2) : "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [who, setWho] = useState(signedIn?.player ?? "");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const balance = players.find((p) => p.name === player)?.balance ?? null;
  const amt = Number(amount);
  const pick = (name: string) => { setPlayer(name); setResult(null); const b = players.find((p) => p.name === name)?.balance ?? 0; setAmount(b > 0.01 ? b.toFixed(2) : ""); };

  const problems: string[] = [];
  if (!player) problems.push("Pick a player.");
  if (!to) problems.push("Say who was paid.");
  else if (to === player) problems.push("The payer and the recipient must be different people.");
  if (!amount.trim() || !Number.isFinite(amt) || amt < 0.01) problems.push("Enter the amount you paid.");
  else if (amt > 500) problems.push("That is more than anyone owes. Check the amount.");
  if (!date) problems.push("Pick the date you paid."); else if (date > today) problems.push("That date is in the future.");
  if (!signedIn && who.trim().length < 2) problems.push("Add your name.");
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
        <SummaryCard className="mt-4" label={`Payment · ${shortDate(date)}`} title={`${fmtMoney(amt)} from ${player} to ${to || payer || "the club"}`} detail={`${left !== null && left <= 0.01 ? "All settled" : left !== null ? `${fmtMoney(left)} still to pay` : "Received"} · ${result.applied ? "recorded" : "waiting for the admin to approve"}`} />
      </SubmissionResult>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card card-pad grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select label="Who paid" value={player} onChange={pick} options={players.map((p) => ({ value: p.name, label: optionLabel(p) }))} hint="Whose share of the pitch this covers." />
        <Select label="Paid to" value={to} onChange={(v) => { setTo(v); setResult(null); }} options={[...(to ? [] : [{ value: "", label: "Pick who received it" }]), ...players.map((p) => ({ value: p.name, label: p.name === payer ? `${p.name} · paid for this season's pitch` : p.name }))]} hint={payer ? (to && to !== payer ? `${payer} paid for the pitch this season; the admin will check who should be credited.` : `${payer} paid for the pitch this season.`) : "Whoever paid for the pitch."} />
        <Field label="Amount (£)" hint={balance !== null && balance > 0.01 ? <>On the records {player} owes {fmtMoney(balance)}. <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="link focus-ring rounded">Settle up</button></> : balance !== null && balance < -0.01 ? `${player} is already ${fmtMoney(-balance)} in credit. Log it anyway if money moved.` : "Nothing outstanding. You can still record a payment."}>
          <span className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">£</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" required className={`${inputClass} pl-7 tabular`} /></span>
        </Field>
        <Field label="Date paid" hint="When the money left your account.">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required className={`${inputClass} tabular`} />
        </Field>
        <Field label="Reference (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Bank reference, or which games it covers" className={inputClass} /></Field>
        {signedIn ? <SignedInNote signedIn={signedIn} /> : <Field label="Your name"><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="Usually the same person" className={inputClass} /></Field>}
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className={btn("primary", "md")}><Send size={16} aria-hidden />{busy ? "Sending…" : "Log the payment"}</button>
        {problems.length > 0 && <FormStatus tone="error">{problems[0]}</FormStatus>}
        {result && !result.ok && <FormStatus tone="error" role="alert">{result.error}</FormStatus>}
        <p className="ml-auto text-xs text-muted">{signedIn?.direct ? "Recorded straight away." : "Sent to the admin for approval."} <Link href="/money" className="link">See the balances</Link></p>
      </div>
    </form>
  );
}
