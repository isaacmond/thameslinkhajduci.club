"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { btn } from "./button";
import { MotmStar } from "./ui";

export type SubmitResult = { ok: boolean; error?: string; sent?: boolean; emailed?: boolean; applied?: boolean; appliedBy?: string | null; queued?: boolean; applyError?: string | null; summary?: string; text?: string; /** what happened to the man-of-the-match vote, for a recorded league result */ motm?: string | null };

/** The "it's gone to the admin" card every submit form ends on: summary, optional preview, the message itself and ways to pass it on. */
/** `extra`: one more action for the button row, such as the poll for the next game. */
export function SubmissionResult({ result, onEdit, children, extra }: { result: SubmitResult; onEdit: () => void; children?: React.ReactNode; extra?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!result.text) return; try { await navigator.clipboard.writeText(result.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow">{result.applied ? "Recorded" : result.queued ? "Sent for approval" : result.sent ? "Sent for approval" : "Ready to send"}</p>
      <h2 className="display mt-1 text-3xl leading-none text-ink">{result.summary}</h2>
      <p className="mt-2 text-sm text-muted">{result.applied ? `Recorded${result.appliedBy ? ` by ${result.appliedBy}` : ""}. The site updates within a minute.` : result.queued ? "The admin has been emailed and will approve it shortly." : result.applyError ? `${result.applyError} It has gone to the admin, who will add it by hand.` : result.sent ? "The admin has been emailed and will add it once it's checked." : "Send this on to the admin, who will add it."}</p>
      {result.motm && <p className="mt-3 flex items-start gap-2 rounded-lg bg-sunken/60 px-3 py-2 text-sm text-ink/90"><MotmStar className="mt-1" /><span>{result.motm}</span></p>}
      {children}
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-sunken p-4 font-mono text-xs text-ink/90">{result.text}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(result.text ?? "")}`} target="_blank" rel="noopener noreferrer" className={btn("primary")}>Share on WhatsApp</a>
        <button type="button" onClick={copy} className={btn("secondary")}>{copied ? <Check size={16} className="text-accent" aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copied" : "Copy"}</button>
        <button type="button" onClick={onEdit} className={btn("ghost")}>Edit</button>
        {extra}
      </div>
    </div>
  );
}
