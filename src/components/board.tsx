"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { londonEpoch } from "@/lib/time";

export type BoardRow = { time: string; label: string; destination: string; status: string; shortStatus?: string; tone?: "ok" | "late" | "bad" | "muted"; href?: string };
const pad = (n: number) => String(n).padStart(2, "0");

/** One shared 1s ticker for every clock/countdown on the page. Server snapshot is null so SSR renders a placeholder and the client fills it in. */
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
  if (now === null) return <span className={clsx("tabular inline-block min-w-[11ch] text-right font-mono opacity-60", className)}>--d --:--:--</span>;
  const diff = target - now;
  if (diff <= 0 && diff > -2 * 3600_000) return <span className={clsx("animate-pulse-soft inline-block min-w-[11ch] text-right font-mono", className)}>IN PROGRESS (probably)</span>;
  if (diff <= 0) return <span className={clsx("font-mono", className)}>DEPARTED</span>;
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  return <span className={clsx("tabular inline-block min-w-[11ch] text-right font-mono", className)}>{d > 0 && `${d}d `}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

/** The drum of a Solari flap: capitals, digits and the three bits of punctuation the records actually use. */
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:·–";
const FLAP_MS = 45;

/**
 * Split-flap text. The server renders the finished string (no layout shift, works without JS); once mounted, and again whenever
 * `text` changes, each character flips through the drum and lands on its target, settling left to right with a small stagger.
 * Rendered monospace + tabular so the row is exactly as wide mid-flip as it is at rest. Honours prefers-reduced-motion by not flipping at all.
 */
function Flap({ text, className, duration = 700 }: { text: string; className?: string; duration?: number }) {
  // null = at rest, show `text`. A string = mid-flip frame. State is only ever set from rAF callbacks, never synchronously in the effect.
  const [frame, setFrame] = useState<string | null>(null);
  useEffect(() => {
    if (!text.trim() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = Array.from(text), n = chars.length, len = FLAP_CHARS.length;
    const lead = Math.min(280, duration * 0.4);
    const stagger = n > 1 ? Math.min(45, (duration - lead) / (n - 1)) : 0;
    const start = performance.now();
    let raf = 0, last = "";
    const step = (t: number) => {
      const elapsed = t - start;
      let settled = true;
      const out = chars.map((c, i) => {
        const remaining = Math.ceil((lead + i * stagger - elapsed) / FLAP_MS);
        if (c === " " || remaining <= 0) return c;
        settled = false;
        const target = FLAP_CHARS.indexOf(c.toUpperCase());
        // Count up the drum so the flap arrives at its letter rather than jumping to it. Characters not on the drum just spin.
        return FLAP_CHARS[((((target < 0 ? i * 7 : target) - remaining) % len) + len) % len];
      });
      if (settled) { setFrame(null); return; }
      const s = out.join("");
      if (s !== last) { last = s; setFrame(s); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);
  if (frame === null) return <span className={clsx("tabular", className)}>{text}</span>;
  return <span className={clsx("tabular", className)}><span aria-hidden>{frame}</span><span className="sr-only">{text}</span></span>;
}

const toneClass = { ok: "text-mint-soft", late: "text-gold", bad: "text-loss-soft", muted: "text-ash" } as const;

/** A departures board. Because if there is one thing this club knows about, it is delays. */
export function DepartureBoard({ rows, next, station = "Whitechapel" }: { rows: BoardRow[]; next: { date: string; time: string; opponent: string; href: string } | null; station?: string }) {
  const target = next ? londonEpoch(next.date, next.time) : null;
  return (
    <section aria-label="Departure board" className="scanlines relative overflow-hidden rounded-2xl border border-white/10 bg-[#07130b] shadow-card">
      <div className="relative z-[2] flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ash">
        <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-mint animate-pulse-soft" aria-hidden /><span className="truncate">Departures · <Flap text={station} className="font-mono" /></span></span>
        <LiveClock />
      </div>
      {next && target !== null && (
        <Link href={next.href} className="focus-ring relative z-[2] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 bg-gold/[0.07] px-4 py-3 transition-colors hover:bg-gold/[0.12]">
          <span className="min-w-0 font-mono text-[11px] uppercase tracking-widest text-ash">Next departure<span className="mx-2 text-ash/50">·</span><span className="normal-case tracking-normal text-cream">{next.opponent}</span></span>
          <Countdown target={target} className="board-glow display text-3xl text-gold sm:text-4xl" />
        </Link>
      )}
      <ul className="relative z-[2] divide-y divide-white/[0.06] font-mono text-sm sm:text-[15px]">
        {rows.map((r, i) => {
          const tone = toneClass[r.tone ?? "muted"];
          const inner = (
            <span className="grid grid-cols-[3.5rem_1fr] gap-x-3 sm:flex sm:items-center sm:gap-3">
              <span className="flex flex-col items-start gap-1 sm:contents">
                <Flap text={r.time} duration={600} className="board-glow whitespace-nowrap text-gold sm:w-16 sm:shrink-0" />
                <Flap text={r.shortStatus ?? r.status} duration={600} className={clsx("board-glow rounded-sm bg-white/5 px-1 py-0.5 text-[9px] uppercase tracking-wider sm:hidden", tone)} />
              </span>
              <span className="min-w-0 sm:flex sm:flex-1 sm:items-center sm:gap-3">
                <span className="block text-[11px] uppercase tracking-widest text-ash sm:w-32 sm:shrink-0">{r.label}</span>
                <Flap text={r.destination} duration={800} className="line-clamp-2 text-[13px] text-cream/90 sm:truncate sm:text-[15px]" />
              </span>
              <Flap text={r.status} className={clsx("board-glow hidden shrink-0 text-right uppercase tracking-wider sm:block", tone)} />
            </span>
          );
          const cls = "focus-ring block px-4 py-3 transition-colors";
          return <li key={i}>{r.href ? <Link href={r.href} className={clsx(cls, "hover:bg-white/[0.04]")}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
        })}
      </ul>
    </section>
  );
}
