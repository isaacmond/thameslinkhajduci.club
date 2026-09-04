"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export type Edit = { cell: string; value: string | number; what: string };
export type SubmitResult = { ok: boolean; error?: string; sent?: boolean; emailed?: boolean; summary?: string; text?: string; edits?: Edit[]; tab?: string | null; sheetUrl?: string };

/** The "it's gone to the admin" card every submit form ends on: summary, optional preview, the message itself and ways to pass it on. */
export function SubmissionResult({ result, onEdit, children }: { result: SubmitResult; onEdit: () => void; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!result.text) return; try { await navigator.clipboard.writeText(result.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow">{result.sent ? "Sent for approval" : "Ready to send"}</p>
      <h2 className="display mt-1 text-3xl text-cream">{result.summary}</h2>
      <p className="mt-2 text-sm text-ash">{result.sent ? "The admin has been emailed and will update the records once it's checked. Nothing changes on the site until then. You can still post it to the group chat so everyone knows." : "Nothing changes on the site until the admin approves it. Send the request on, or copy it, and they'll apply it in seconds."}</p>
      {children}
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-night/70 p-4 font-mono text-xs text-cream/90">{result.text}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(result.text ?? "")}`} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2.5 font-semibold text-night hover:bg-mint-soft">Send to the group chat</a>
        <button type="button" onClick={copy} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10">{copied ? <Check size={16} className="text-mint" aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copied" : "Copy"}</button>
        {result.sheetUrl && <a href={result.sheetUrl} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10"><ExternalLink size={16} aria-hidden />Open the records</a>}
        <button type="button" onClick={onEdit} className="focus-ring inline-flex items-center rounded-lg px-4 py-2.5 text-sm text-ash hover:text-cream">Edit</button>
      </div>
    </div>
  );
}
