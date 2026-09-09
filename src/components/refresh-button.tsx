"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { btn } from "./button";

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
  const label = busy ? "Refreshing…" : state === "done" ? "Refreshed" : state === "error" ? "Couldn't refresh, try again" : "Force refresh";
  return (
    <button type="button" onClick={go} aria-disabled={busy} className={btn("secondary", "sm", className)}>
      <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />
      <span role="status" aria-live="polite">{label}</span>
    </button>
  );
}
