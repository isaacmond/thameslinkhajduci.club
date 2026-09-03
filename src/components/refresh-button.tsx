"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";

export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const go = async () => {
    setState("busy");
    try { const r = await fetch("/api/revalidate", { method: "POST" }); if (!r.ok) throw new Error(); router.refresh(); setState("done"); setTimeout(() => setState("idle"), 4000); }
    catch { setState("error"); setTimeout(() => setState("idle"), 4000); }
  };
  return (
    <button type="button" onClick={go} disabled={state === "busy"} className={clsx("focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-cream transition-colors hover:bg-white/10 disabled:opacity-60", className)}>
      <RefreshCw size={16} className={state === "busy" ? "animate-spin" : ""} aria-hidden />
      {state === "busy" ? "Re-reading the sheet…" : state === "done" ? "Refreshed" : state === "error" ? "Sheet unreachable" : "Force refresh from sheet"}
    </button>
  );
}
