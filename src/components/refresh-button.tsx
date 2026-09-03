"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";

export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const busy = state === "busy" || pending;
  const go = async () => {
    if (busy) return;
    setState("busy");
    try {
      const r = await fetch("/api/revalidate", { method: "POST" });
      if (!r.ok) throw new Error();
      startTransition(() => { router.refresh(); });
      setState("done"); setTimeout(() => setState("idle"), 4000);
    } catch { setState("error"); setTimeout(() => setState("idle"), 4000); }
  };
  const label = busy ? "Re-reading the sheet…" : state === "done" ? "Refreshed from the sheet" : state === "error" ? "Sheet unreachable, try again" : "Force refresh from sheet";
  return (
    <button type="button" onClick={go} aria-disabled={busy} className={clsx("focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-cream transition-colors hover:bg-white/10 aria-disabled:opacity-60", className)}>
      <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />
      <span role="status" aria-live="polite">{label}</span>
    </button>
  );
}
