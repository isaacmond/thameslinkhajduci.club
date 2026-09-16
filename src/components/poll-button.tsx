"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, Vote, X } from "lucide-react";
import { btn } from "./button";
import { POLL_OPTIONS, pollMessage, pollQuestion, type PollFixture } from "@/lib/poll";

/**
 * "Poll the group chat": one tap copies the poll question for a fixture and opens a card showing the poll as WhatsApp lays it out
 * (question, Select one, In, Out) with the three steps to paste it in. WhatsApp cannot be handed a ready-made poll, so this is the
 * closest thing: the question is on the clipboard and the answers are always the same two words.
 */
export function PollButton({ fixture, label = "Poll the group chat", className }: { fixture: PollFixture; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"question" | "message" | null>(null);
  const question = pollQuestion(fixture);
  const copy = async (what: "question" | "message") => {
    try { await navigator.clipboard.writeText(what === "question" ? question : pollMessage(fixture)); setCopied(what); setTimeout(() => setCopied(null), 2500); }
    catch { /* clipboard blocked: the text is on screen to select */ }
  };
  const openAndCopy = () => { setOpen(true); void copy("question"); };
  return (
    <>
      <button type="button" onClick={open ? () => setOpen(false) : openAndCopy} aria-expanded={open} className={clsx("focus-ring chip gap-1.5 border-gold/40 bg-gold/10 text-gold transition-colors hover:bg-gold/20", className)}>
        <Vote size={14} aria-hidden />{label}
      </button>
      {open && (
        <div role="dialog" aria-label="Poll for the group chat" className="basis-full">
          <div className="mx-auto mt-3 max-w-md rounded-2xl border border-white/10 bg-night/70 p-4 text-left shadow-card">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">Paste this poll</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="focus-ring -mr-1 -mt-1 rounded-md p-1 text-ash hover:text-cream"><X size={14} aria-hidden /></button>
            </div>
            {/* The poll as the chat will show it, so what gets typed matches what everyone is used to. */}
            <div className="mt-2 rounded-xl bg-[#d9fdd3] p-3 text-[#111b21]">
              <p className="text-sm font-semibold leading-snug">{question}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#111b21]/60"><Check size={12} className="rounded-full bg-[#111b21]/50 p-[1px] text-[#d9fdd3]" aria-hidden />Select one</p>
              <ul className="mt-2 space-y-2">{POLL_OPTIONS.map((o) => <li key={o} className="flex items-center gap-3 text-sm"><span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#111b21]/40" aria-hidden />{o}</li>)}</ul>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-ash">
              <li>In the group chat tap <span className="text-cream">+</span> (or the paperclip), then <span className="text-cream">Poll</span>.</li>
              <li>Paste the question. {copied === "question" ? <span className="text-mint-soft">It is on your clipboard.</span> : <button type="button" onClick={() => copy("question")} className="focus-ring link">Copy it again.</button>}</li>
              <li>Options <span className="text-cream">In</span> and <span className="text-cream">Out</span>, leave &ldquo;allow multiple answers&rdquo; off, send.</li>
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => copy("question")} className={btn("primary", "sm")}>{copied === "question" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied === "question" ? "Copied" : "Copy the question"}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(pollMessage(fixture))}`} target="_blank" rel="noopener noreferrer" className={btn("secondary", "sm")}>Send as a message instead</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
