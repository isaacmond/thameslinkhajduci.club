"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import clsx from "clsx";

/** Native share sheet where available (phones), clipboard everywhere else. */
export function ShareButton({ title, text, className }: { title: string; text: string; className?: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setDone(true); setTimeout(() => setDone(false), 2000);
    } catch { /* user dismissed the sheet */ }
  };
  return (
    <button type="button" onClick={share} className={clsx("focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-white/10", className)}>
      {done ? <Check size={14} className="text-mint-soft" aria-hidden /> : <Share2 size={14} aria-hidden />}
      <span role="status" aria-live="polite">{done ? "Copied for the group chat" : "Share"}</span>
    </button>
  );
}
