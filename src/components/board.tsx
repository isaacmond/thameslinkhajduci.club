"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { londonEpoch } from "@/lib/time";

export type BoardRow = { time: string; label: string; destination: string; status: string; tone?: "ok" | "late" | "bad" | "muted"; href?: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** One shared 1s ticker for every clock/countdown on the page. Server snapshot is null so SSR renders a placeholder and the client fills it in without a setState-in-effect. */
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

function LiveClock() {
  const now = useNow();
  return <span className="tabular font-mono">{now ? new Date(now).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</span>;
}

export function Countdown({ target, className }: { target: number; className?: string }) {
  const now = useNow();
  if (now === null) return <span className={clsx("tabular font-mono opacity-60", className)}>--d --:--:--</span>;
  const diff = target - now;
  if (diff <= 0 && diff > -2 * 3600_000) return <span className={clsx("animate-pulse-soft font-mono", className)}>IN PROGRESS (probably)</span>;
  if (diff <= 0) return <span className={clsx("font-mono", className)}>DEPARTED</span>;
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  return <span className={clsx("tabular font-mono", className)}>{d > 0 && `${d}d `}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

const toneClass = { ok: "text-mint-soft", late: "text-gold", bad: "text-[#ff9a9d]", muted: "text-ash" } as const;

/** A departures board. Because if there is one thing this club knows about, it is delays. */
export function DepartureBoard({ rows, next, station = "Whitechapel" }: { rows: BoardRow[]; next: { date: string; time: string; opponent: string; href: string } | null; station?: string }) {
  const target = next ? londonEpoch(next.date, next.time) : null;
  return (
    <section aria-label="Departure board" className="overflow-hidden rounded-2xl border border-white/10 bg-[#07130b] shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ash">
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-mint animate-pulse-soft" aria-hidden />Departures · {station}</span>
        <LiveClock />
      </div>
      <ul className="divide-y divide-white/[0.06] font-mono text-sm sm:text-[15px]">
        {rows.map((r, i) => {
          const inner = (
            <>
              <span className="tabular w-14 shrink-0 whitespace-nowrap pt-0.5 text-gold sm:w-16">{r.time}</span>
              <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                <span className="block text-[10px] uppercase tracking-widest text-ash sm:w-32 sm:shrink-0 sm:text-[11px]">{r.label}</span>
                <span className="line-clamp-2 text-cream/90 sm:truncate">{r.destination}</span>
              </span>
              <span className={clsx("shrink-0 pt-0.5 text-right text-[11px] uppercase tracking-wider sm:text-sm", toneClass[r.tone ?? "muted"])}>{r.status}</span>
            </>
          );
          const cls = "flex items-start gap-3 px-4 py-2.5 transition-colors sm:items-center";
          return <li key={i}>{r.href ? <Link href={r.href} className={clsx(cls, "hover:bg-white/[0.04]")}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
        })}
      </ul>
      {next && target !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-gold/[0.06] px-4 py-3 text-sm">
          <span className="text-ash">Next kick-off vs <Link href={next.href} className="link font-medium text-cream">{next.opponent}</Link></span>
          <Countdown target={target} className="display text-2xl text-gold" />
        </div>
      )}
    </section>
  );
}
