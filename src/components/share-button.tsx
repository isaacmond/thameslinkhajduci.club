"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import clsx from "clsx";

/** Fetch a PNG and wrap it as a File for the share sheet. Null on any failure so the caller falls back to a plain share. */
async function fetchImageFile(src: string, filename: string): Promise<File | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  } catch { return null; }
}

/**
 * Native share sheet where available (phones), clipboard everywhere else.
 * Pass `image` (URL of a PNG, e.g. the page's OG image) and the sheet gets the picture too, where the browser supports sharing files;
 * the link rides along in the text because some platforms drop `url` when files are attached.
 */
export function ShareButton({ title, text, image, filename = "thameslink-hajduci.png", className }: { title: string; text: string; image?: string; filename?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        const file = image && typeof navigator.canShare === "function" ? await fetchImageFile(image, filename) : null;
        if (file && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title, text: `${text}\n${url}` }); return; }
          catch (e) { if ((e as DOMException).name === "AbortError") return; /* files not accepted after all: fall back to the plain sheet */ }
        }
        await navigator.share({ title, text, url }); return;
      }
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
