import clsx from "clsx";

const toneClass = { ok: "text-mint-soft", late: "text-gold", bad: "text-[#ff9a9d]", muted: "text-ash" } as const;

/**
 * One departure-board row as a standalone card: same scanlines, glow and mono type as the home-page board, no clock.
 * Used where a single service announcement is the point (a freshly submitted score, say). Plain component, so it works on either side.
 */
export function BoardPreview({ time, label, destination, status, tone = "muted", shortStatus, station = "Whitechapel", caption, className }: { time: string; label: string; destination: string; status: string; tone?: keyof typeof toneClass; shortStatus?: string; station?: string; caption?: string; className?: string }) {
  const t = toneClass[tone];
  return (
    <div aria-label="Service announcement" className={clsx("scanlines relative overflow-hidden rounded-2xl border border-white/10 bg-[#07130b] shadow-card", className)}>
      <div className="relative z-[2] flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ash">
        <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-mint animate-pulse-soft" aria-hidden /><span className="truncate">Departures · {station}</span></span>
        {caption && <span className="hidden shrink-0 font-mono normal-case tracking-normal text-ash/80 sm:inline">{caption}</span>}
      </div>
      <div className="relative z-[2] px-4 py-3 font-mono text-sm sm:text-[15px]">
        <span className="grid grid-cols-[3.5rem_1fr] gap-x-3 sm:flex sm:items-center sm:gap-3">
          <span className="flex flex-col items-start gap-1 sm:contents">
            <span className="board-glow tabular whitespace-nowrap text-gold sm:w-16 sm:shrink-0">{time}</span>
            <span className={clsx("board-glow rounded-sm bg-white/5 px-1 py-0.5 text-[9px] uppercase tracking-wider sm:hidden", t)}>{shortStatus ?? status}</span>
          </span>
          <span className="min-w-0 sm:flex sm:flex-1 sm:items-center sm:gap-3">
            <span className="block text-[11px] uppercase tracking-widest text-ash sm:w-32 sm:shrink-0">{label}</span>
            <span className="line-clamp-2 text-[13px] text-cream/90 sm:truncate sm:text-[15px]">{destination}</span>
          </span>
          <span className={clsx("board-glow hidden shrink-0 text-right uppercase tracking-wider sm:block", t)}>{status}</span>
        </span>
      </div>
    </div>
  );
}
