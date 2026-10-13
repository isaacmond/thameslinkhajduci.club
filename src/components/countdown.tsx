"use client";
import { useSyncExternalStore } from "react";
import clsx from "clsx";

const pad = (n: number) => String(n).padStart(2, "0");

/** One shared 1s ticker for every countdown on the page. Server snapshot is null so SSR renders a placeholder and the client fills it in. */
let tick = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => { tick = Date.now(); listeners.forEach((l) => l()); }, 1000);
  return () => { listeners.delete(cb); if (!listeners.size && timer) { clearInterval(timer); timer = undefined; } };
}
function getSnapshot() { if (!tick) tick = Date.now(); return tick; }
export function useNow(): number | null { return useSyncExternalStore(subscribe, getSnapshot, () => null); }

/** Time to kick-off as "3d 04:12:09"; "Under way" for the two hours after, then "Full time". */
export function Countdown({ target, className }: { target: number; className?: string }) {
  const now = useNow();
  if (now === null) return <span className={clsx("tabular inline-block min-w-[11ch] opacity-60", className)}>–</span>;
  const diff = target - now;
  if (diff <= 0 && diff > -2 * 3600_000) return <span className={className}>Under way</span>;
  if (diff <= 0) return <span className={className}>Full time</span>;
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  return <span className={clsx("tabular inline-block min-w-[11ch]", className)}>{d > 0 && `${d}d `}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}
