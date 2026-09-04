import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import type { Match, MatchLite, Player, Result, SeasonSummary } from "@/lib/types";
import { fmtDate, gwLabel, initials, ppg, scoreline, signed } from "@/lib/stats";
import { slugify } from "@/lib/slug";
import { CountUp } from "./count-up";
import { Roundel } from "./roundel";

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="display text-5xl leading-none text-cream sm:text-6xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-ash sm:text-base">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionTitle({ children, sub, right, id }: { children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id={id} className="display text-3xl leading-none text-cream">{children}</h2>
        {sub && <p className="mt-1 text-sm text-ash">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default", size = "md" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "win" | "draw" | "loss" | "gold"; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={clsx("card h-full", size === "sm" ? "px-3 py-2.5" : "px-4 py-3")}>
      <p className={clsx("eyebrow", size === "sm" && "!text-[10px] !tracking-[0.14em] whitespace-nowrap")}>{label}</p>
      <p className={clsx("display tabular leading-none", size === "lg" ? "mt-1 text-5xl" : size === "sm" ? "mt-1 text-3xl" : "mt-1 text-4xl", tone === "win" && "text-mint-soft", tone === "loss" && "text-[#ff9a9d]", tone === "draw" && "text-[#ffe27a]", tone === "gold" && "text-gold", tone === "default" && "text-cream")}>{value}</p>
      {sub && <p className={clsx("mt-1 text-ash", size === "sm" ? "text-[11px]" : "text-xs")}>{sub}</p>}
    </div>
  );
}

/** Four-up P/W/D/L with a GF/GA/GD/pts line. Compact enough for phones; used on home, season and player pages. */
export function RecordStrip({ s, className, animate = false }: { s: SeasonSummary; className?: string; animate?: boolean }) {
  const cells: [string, number, string][] = [["Played", s.played, "text-cream"], ["Won", s.won, "text-mint-soft"], ["Drawn", s.drawn, "text-[#ffe27a]"], ["Lost", s.lost, "text-[#ff9a9d]"]];
  return (
    <div className={className}>
      <dl className="grid grid-cols-4 divide-x divide-white/10 text-center">
        {cells.map(([k, v, c]) => <div key={k} className="flex flex-col-reverse py-4"><dt className="eyebrow mt-1">{k}</dt><dd className={clsx("display tabular text-4xl leading-none sm:text-5xl", c)}>{animate ? <CountUp value={v} /> : v}</dd></div>)}
      </dl>
      <p className="border-y border-white/10 bg-white/[0.03] px-4 py-2 text-center text-xs text-ash">GF <span className="text-cream">{s.goalsFor}</span> · GA <span className="text-cream">{s.goalsAgainst}</span> · GD <span className="text-cream">{signed(s.goalsFor - s.goalsAgainst)}</span> · <span className="text-cream">{ppg(s).toFixed(2)}</span> pts/game</p>
    </div>
  );
}

/** Club shirt used where a player has no photo. The number does the talking. */
export function Shirt({ number, name, className }: { number: number | null; name: string; className?: string }) {
  const surname = name.split(" ").slice(-1)[0].toUpperCase();
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label={`${name} shirt`}>
      <defs><linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c5b39" /><stop offset="1" stopColor="#173d25" /></linearGradient></defs>
      <path d="M60 18 L84 8 Q100 22 116 8 L140 18 L186 48 L164 84 L144 72 L144 210 L56 210 L56 72 L36 84 L14 48 Z" fill="url(#shirt)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <path d="M84 8 Q100 40 116 8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <text x="100" y="86" textAnchor="middle" fontSize="15" letterSpacing="3" fill="rgba(246,241,230,0.75)" style={{ fontFamily: "var(--font-display)" }}>{surname}</text>
      <text x="100" y="178" textAnchor="middle" fontSize={number !== null && number >= 10 ? 96 : 104} fill="#f6f1e6" style={{ fontFamily: "var(--font-display)" }}>{number ?? "?"}</text>
    </svg>
  );
}

export function ResultPill({ result, className, size = "md" }: { result: Result | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const r = result ?? "X";
  return <span className={clsx("chip justify-center font-bold", `result-${r}`, size === "sm" && "h-6 w-6 !p-0 text-[11px]", size === "md" && "h-7 w-7 !p-0 text-xs", size === "lg" && "h-9 w-9 !p-0 text-sm", className)} aria-label={result === "W" ? "Win" : result === "D" ? "Draw" : result === "L" ? "Loss" : "Not played"}>{r === "X" ? "–" : r}</span>;
}

export function FormStrip({ matches, size = "md" }: { matches: (Match | MatchLite)[]; size?: "sm" | "md" }) {
  return (
    <div className="flex gap-1" aria-label="Recent form">
      {matches.map((m) => <Link key={m.id} href={`/matches/${m.id}`} title={`${fmtDate(m.date)} · ${m.opponent} ${scoreline(m)}`} className="focus-ring -m-1 rounded-full p-1"><ResultPill result={m.result} size={size} /></Link>)}
      {!matches.length && <span className="text-xs text-ash">No games yet</span>}
    </div>
  );
}

export function Avatar({ name, photo, size = 40, shirt, priority = false }: { name: string; photo?: string; size?: number; shirt?: number | null; priority?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" width={size} height={size} className="h-full w-full rounded-full object-cover ring-1 ring-white/15" unoptimized={photo.startsWith("http")} priority={priority} />
      ) : (
        <span className="display flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-forest to-pine text-cream ring-1 ring-white/15" style={{ fontSize: size * 0.42 }} aria-hidden>{initials(name)}</span>
      )}
      {shirt !== undefined && shirt !== null && <span className="absolute -bottom-1 -right-1 rounded-full bg-gold px-1 text-[10px] font-bold text-night ring-2 ring-night">{shirt}</span>}
    </span>
  );
}

export function PlayerLink({ name, player, className, avatar = false }: { name: string; player?: Player; className?: string; avatar?: boolean }) {
  return (
    <Link href={`/squad/${player?.slug ?? slugify(name)}`} className={clsx("focus-ring inline-flex items-center gap-2 rounded font-medium text-cream transition-colors hover:text-mint-soft hover:underline hover:underline-offset-4", className)}>
      {avatar && <Avatar name={name} photo={player?.extra.photo} size={28} />}
      {player?.extra.nickname ? <span>{name} <span className="text-ash">“{player.extra.nickname}”</span></span> : name}
    </Link>
  );
}

const relDay = (date: string | null, today?: string) => {
  if (!date || !today) return null;
  const n = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  return n < 0 ? null : n === 0 ? "Tonight" : n === 1 ? "Tomorrow" : `in ${n}d`;
};
/** One fixture/result line. Pass `today` (ISO date from the server) for fixtures so the relative day matches between server and client. */
export function MatchRow({ m, showSeason = false, today }: { m: Match | MatchLite; showSeason?: boolean; today?: string }) {
  const scorers = m.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals);
  const rel = m.played ? null : relDay(m.date, today);
  return (
    <Link href={`/matches/${m.id}`} className="focus-ring group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/5 px-3 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
      {m.played ? <ResultPill result={m.result} size="lg" /> : <span className="chip h-9 w-9 justify-center !p-0 text-[10px] text-ash" aria-label={gwLabel(m)}>{m.seasonId === "FR" ? "F" : "GW"}{m.gw}</span>}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2">
          <Roundel name={m.opponent} size={18} className="shrink-0" />
          <span className="truncate font-semibold text-cream">{m.opponent}</span>
          {m.type && <span className="chip text-ash">{m.type}</span>}
        </div>
        <div className="truncate text-xs text-ash">
          {showSeason && <span className="text-mint-soft">{m.seasonId === "FR" ? "Friendly" : m.seasonId} · </span>}{gwLabel(m)} · {fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{m.kickOff && ` · ${m.kickOff}`}
          {scorers.length > 0 && <span className="hidden sm:inline"> · ⚽ {scorers.map((s) => `${s.player.split(" ")[0]}${s.goals > 1 ? ` ×${s.goals}` : ""}`).join(", ")}</span>}
          {m.motm && <span className="hidden text-gold sm:inline"> · ★ {m.motm}</span>}
        </div>
      </div>
      <span className="display tabular text-right text-3xl leading-none text-cream">{m.played ? `${m.ourGoals}–${m.theirGoals}` : <span className="text-base text-ash">{rel ?? m.kickOff ?? "TBC"}{rel && m.kickOff && <span className="block text-[11px] text-ash/70">{m.kickOff}</span>}</span>}</span>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card px-4 py-8 text-center text-sm text-ash">{children}</div>;
}

export function Crest({ size = 160, className }: { size?: number; className?: string }) {
  return <Image src="/crest.png" alt="Thameslink Hajduci crest" width={size} height={size} priority className={clsx("drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]", className)} />;
}

/** Ranked list with proportional bars behind each row. CSS only, so it costs nothing on the client. */
export function LeaderList({ items, color = "bg-mint", format = (v: number) => String(v), emptyText = "Nothing to show yet" }: { items: { player: Player; value: number }[]; color?: string; format?: (v: number) => string; emptyText?: string }) {
  const max = items[0]?.value || 1;
  if (!items.length) return <p className="text-sm text-ash">{emptyText}</p>;
  return (
    <ol className="space-y-1">
      {items.map((x, i) => (
        <li key={x.player.slug} className="relative overflow-hidden rounded-lg">
          <span className={clsx("absolute inset-y-0 left-0 rounded-lg opacity-[0.18]", color)} style={{ width: `${Math.max(3, (x.value / max) * 100)}%` }} aria-hidden />
          <span className="relative flex items-center gap-3 px-3 py-1.5">
            <span className="display w-5 shrink-0 text-lg text-ash">{i + 1}</span>
            <Avatar name={x.player.name} photo={x.player.extra.photo} size={28} />
            <PlayerLink name={x.player.name} player={x.player} className="min-w-0 truncate text-sm" />
            <span className="display tabular ml-auto shrink-0 text-xl text-cream sm:text-2xl">{format(x.value)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Tag({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "gold" | "mint" | "loss"; className?: string }) {
  return <span className={clsx("chip", tone === "gold" && "border-gold/40 bg-gold/10 text-gold", tone === "mint" && "border-mint/40 bg-mint/10 text-mint-soft", tone === "loss" && "border-loss/40 bg-loss/10 text-[#ff9a9d]", tone === "default" && "text-ash", className)}>{children}</span>;
}

export function Callout({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="card flex items-start gap-3 px-4 py-3 text-sm text-ash">{icon && <span className="mt-0.5 text-gold">{icon}</span>}<div>{children}</div></div>;
}
