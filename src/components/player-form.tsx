"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Send } from "lucide-react";
import { FormStatus, inputClass } from "./controls";
import { btn } from "./button";
import { Shirt } from "./ui";
import { SubmissionResult, type SubmitResult } from "./submission-result";
import { SignedInNote, type SignedIn } from "./signed-in-note";

const POSITIONS = [["GK", "Keeper"], ["DEF", "Defender"], ["MID", "Midfield"], ["FWD", "Forward"]] as const;

export function PlayerForm({ roster, takenShirts, seasonId, signedIn = null }: { roster: string[]; takenShirts: Record<string, string>; seasonId: string | null; signedIn?: SignedIn | null }) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [shirt, setShirt] = useState("");
  const [photo, setPhoto] = useState("");
  const [note, setNote] = useState("");
  const [who, setWho] = useState(signedIn?.player ?? "");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const trimmed = name.trim().replace(/\s+/g, " ");
  const clash = roster.find((r) => r.toLowerCase() === trimmed.toLowerCase());
  const shirtNo = shirt.trim() === "" ? null : Number(shirt);
  const worn = shirtNo !== null && takenShirts[String(shirtNo)];

  const problems: string[] = [];
  if (trimmed.length < 2) problems.push("Add the player's name.");
  else if (!trimmed.includes(" ")) problems.push("First name and surname, please.");
  else if (clash) problems.push(`${clash} is already in the squad.`);
  if (shirtNo !== null && (!Number.isInteger(shirtNo) || shirtNo < 1 || shirtNo > 99)) problems.push("Shirt numbers run 1 to 99.");
  else if (worn) problems.push(`${shirtNo} is ${worn}'s shirt.`);
  if (photo.trim() && !/^https:\/\/\S+$/.test(photo.trim())) problems.push("Photo needs to be an https link.");
  if (!signedIn && who.trim().length < 2) problems.push("Add your name.");
  const canSubmit = problems.length === 0 && !busy;
  const toggle = (p: string) => setPositions((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "player", name: trimmed, nickname, positions, shirt: shirtNo, photo: photo.trim(), note, submittedBy: who, website }) });
      setResult((await r.json()) as SubmitResult);
    } catch { setResult({ ok: false, error: "Couldn't reach the server. Try again." }); }
    setBusy(false);
  };

  if (result?.ok) {
    return (
      <SubmissionResult result={result} onEdit={() => setResult(null)}>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-ink/10 bg-paper/40 p-4">
          <Shirt number={shirtNo} name={trimmed} className="h-16 w-16 shrink-0" />
          <div className="min-w-0"><p className="display truncate text-2xl text-ink">{trimmed}</p><p className="text-xs text-muted">{[nickname && `“${nickname}”`, positions.join("/"), seasonId && `joins for ${seasonId}`].filter(Boolean).join(" · ") || "Details to follow"}</p></div>
        </div>
      </SubmissionResult>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span className="eyebrow">Full name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setResult(null); }} required maxLength={40} autoComplete="off" placeholder="First name and surname" className={inputClass} />
          <span className="min-h-[1.25rem] text-[11px] text-muted">{clash ? `${clash} already has a profile.` : "As it should appear on the site."}</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted"><span className="eyebrow">Nickname (optional)</span><input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} placeholder="Optional" className={inputClass} /></label>
        <div className="flex flex-col gap-1 text-xs text-muted">
          <span className="eyebrow" id="positions-label">Position</span>
          <div role="group" aria-labelledby="positions-label" className="grid grid-cols-4 gap-1.5">
            {POSITIONS.map(([code, word]) => { const on = positions.includes(code); return (
              <button key={code} type="button" onClick={() => toggle(code)} aria-pressed={on} className={clsx("focus-ring flex h-[2.375rem] flex-col items-center justify-center rounded-lg border text-center transition-colors", on ? "chip-on" : "chip-off border-ink/10 hover:border-ink/25")}><span className="display text-base leading-none">{code}</span><span className="text-[10px] leading-tight">{word}</span></button>
            ); })}
          </div>
          <span className="min-h-[1.25rem] text-[11px] text-muted">Choose all that apply.</span>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span className="eyebrow">Shirt number (optional)</span>
          <div className="flex items-center gap-3"><input value={shirt} onChange={(e) => setShirt(e.target.value.replace(/[^\d]/g, "").slice(0, 2))} inputMode="numeric" placeholder="1–99" className={`${inputClass} tabular max-w-[7rem]`} /><Shirt number={shirtNo} name={trimmed || "New player"} className="h-[2.375rem] w-[2.375rem]" /></div>
          <span className={clsx("min-h-[1.25rem] text-[11px]", worn ? "text-loss" : "text-muted")}>{worn ? `${shirtNo} is ${worn}'s. Pick another.` : "Numbers already taken are refused."}</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2"><span className="eyebrow">Photo link (optional)</span><input value={photo} onChange={(e) => setPhoto(e.target.value)} maxLength={300} inputMode="url" placeholder="https://… a square-ish photo works best" className={inputClass} /></label>
        {signedIn ? <SignedInNote signedIn={signedIn} /> : <label className="flex flex-col gap-1 text-xs text-muted"><span className="eyebrow">Your name</span><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="Who is vouching for them" className={inputClass} /></label>}
        <label className="flex flex-col gap-1 text-xs text-muted"><span className="eyebrow">Note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="How they found us, when they start" className={inputClass} /></label>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className={btn("primary", "md")}><Send size={16} aria-hidden />{busy ? "Sending…" : "Propose the signing"}</button>
        {problems.length > 0 && <FormStatus tone="error">{problems[0]}</FormStatus>}
        {result && !result.ok && <FormStatus tone="error" role="alert">{result.error}</FormStatus>}
        <p className="ml-auto text-xs text-muted">{signedIn?.direct ? "Added straight away." : "Sent to the admin for approval."} <Link href="/squad" className="link">Back to the squad</Link></p>
      </div>
    </form>
  );
}
