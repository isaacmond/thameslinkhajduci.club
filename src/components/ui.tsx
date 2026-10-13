import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import type { Match, MatchLite, Player, Result, SeasonSummary } from "@/lib/types";
import { fmtDate, gwLabel, initials, ppg, scoreline, signed } from "@/lib/stats";
import { slugify } from "@/lib/slug";
import { CountUp } from "./count-up";
import { TeamBadge } from "./team-badge";

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink/10 pb-6 animate-rise">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-5xl leading-[0.95] text-ink sm:text-6xl">{title}</h1>
        {sub && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Where a detail page sits: parent pages as links, the current page last. */
export function Breadcrumb({ items }: { items: { href?: string; label: React.ReactNode }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      {items.map((it, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden>/</span>}
          {it.href ? <Link href={it.href} className="focus-ring rounded hover:text-ink">{it.label}</Link> : <span className="text-ink" aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SectionTitle({ children, sub, right, id }: { children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="display min-w-0 text-[1.75rem] leading-tight text-ink">{children}</h2>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

/** `money`: amounts use the body typeface with tabular figures, matching the money tables, instead of the serif. */
export function Stat({ label, value, sub, tone = "default", size = "md", money = false }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "win" | "draw" | "loss" | "gold"; size?: "sm" | "md" | "lg"; money?: boolean }) {
  return (
    <div className={clsx("card h-full", size === "sm" ? "px-3 py-3" : "px-4 py-4")}>
      <p className={clsx("eyebrow", size === "sm" && "!text-[10px] truncate")}>{label}</p>
      <p className={clsx("tabular leading-none", money ? "font-semibold tracking-tight" : "display", money ? (size === "lg" ? "mt-2 text-4xl" : size === "sm" ? "mt-1.5 text-2xl" : "mt-2 text-3xl") : size === "lg" ? "mt-2 text-5xl" : size === "sm" ? "mt-1.5 text-3xl" : "mt-2 text-4xl", tone === "win" && "text-win", tone === "loss" && "text-loss", tone === "draw" && "text-draw", tone === "gold" && "text-gold", tone === "default" && "text-ink")}>{value}</p>
      {sub && <p className={clsx("mt-1.5 text-muted", size === "sm" ? "text-[11px]" : "text-xs")}>{sub}</p>}
    </div>
  );
}

/** Played, won, drawn, lost, with goals underneath. Compact enough for phones; used on home, season and player pages. */
export function RecordStrip({ s, className, animate = false }: { s: SeasonSummary; className?: string; animate?: boolean }) {
  const cells: [string, number][] = [["Played", s.played], ["Won", s.won], ["Drawn", s.drawn], ["Lost", s.lost]];
  return (
    <div className={className}>
      <dl className="grid grid-cols-4 divide-x divide-ink/10 text-center">
        {cells.map(([k, v]) => <div key={k} className="flex flex-col-reverse py-5"><dt className="eyebrow mt-2">{k}</dt><dd className="display tabular text-4xl leading-none text-ink sm:text-5xl">{animate ? <CountUp value={v} /> : v}</dd></div>)}
      </dl>
      <p className="border-t border-ink/10 px-4 py-2.5 text-center text-xs text-muted">Scored <span className="font-medium text-ink">{s.goalsFor}</span> · Conceded <span className="font-medium text-ink">{s.goalsAgainst}</span> · Difference <span className="font-medium text-ink">{signed(s.goalsFor - s.goalsAgainst)}</span> · <span className="font-medium text-ink">{ppg(s).toFixed(2)}</span> points a game</p>
    </div>
  );
}

/** Club shirt used where a player has no photo. The number does the talking. */
export function Shirt({ number, name, className }: { number: number | null; name: string; className?: string }) {
  const surname = name.split(" ").slice(-1)[0].toUpperCase();
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label={`${name} shirt`}>
      <path d="M60 18 L84 8 Q100 22 116 8 L140 18 L186 48 L164 84 L144 72 L144 210 L56 210 L56 72 L36 84 L14 48 Z" fill="#24573a" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
      <path d="M84 8 Q100 40 116 8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <text x="100" y="84" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="3" fill="rgba(245,241,232,0.8)" style={{ fontFamily: "var(--font-sans)" }}>{surname}</text>
      <text x="100" y="176" textAnchor="middle" fontSize={number !== null && number >= 10 ? 92 : 100} fill="#f5f1e8" style={{ fontFamily: "var(--font-display)" }}>{number ?? "?"}</text>
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
      {!matches.length && <span className="text-xs text-muted">No games yet</span>}
    </div>
  );
}

export function Avatar({ name, photo, size = 40, shirt, priority = false }: { name: string; photo?: string; size?: number; shirt?: number | null; priority?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0 align-middle" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" width={size} height={size} className="block h-full w-full rounded-full object-cover ring-1 ring-ink/10" unoptimized={photo.startsWith("http")} priority={priority} />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-sunken font-semibold text-muted ring-1 ring-ink/10" style={{ fontSize: size * 0.36 }} aria-hidden>{initials(name)}</span>
      )}
      {shirt !== undefined && shirt !== null && <span className="absolute -bottom-1 -right-1 rounded-full bg-accent px-1 text-[10px] font-bold text-paper ring-2 ring-surface">{shirt}</span>}
    </span>
  );
}

export function PlayerLink({ name, player, className, avatar = false }: { name: string; player?: Player; className?: string; avatar?: boolean }) {
  return (
    <Link href={`/squad/${player?.slug ?? slugify(name)}`} className={clsx("focus-ring inline-flex min-w-0 max-w-full items-center gap-2 rounded font-medium text-ink transition-colors hover:text-accent", className)}>
      {avatar && <Avatar name={name} photo={player?.extra.photo} size={28} />}
      <span className="min-w-0 truncate">{name}{player?.extra.nickname && <> <span className="font-normal italic text-muted">“{player.extra.nickname}”</span></>}</span>
    </Link>
  );
}

const relDay = (date: string | null, today?: string) => {
  if (!date || !today) return null;
  const n = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  return n < 0 ? null : n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};
/** One fixture/result line. Pass `today` (ISO date from the server) for fixtures so the relative day matches between server and client. */
export function MatchRow({ m, showSeason = false, today }: { m: Match | MatchLite; showSeason?: boolean; today?: string }) {
  const scorers = m.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals);
  const rel = m.played ? null : relDay(m.date, today);
  return (
    <Link href={`/matches/${m.id}`} className="focus-ring group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-ink/[0.035]">
      {m.played ? <ResultPill result={m.result} size="lg" /> : <span className="chip h-9 w-9 justify-center !p-0 text-[10px] text-muted" aria-label={gwLabel(m)}>{m.seasonId === "FR" ? "F" : "GW"}{m.gw}</span>}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TeamBadge name={m.opponent} size={20} className="shrink-0" />
          <span className="truncate font-semibold text-ink">{m.opponent}</span>
          {m.type && <span className="chip text-muted">{m.type}</span>}
        </div>
        <div className="truncate text-xs text-muted">
          {showSeason && <span className="font-medium text-ink/70">{m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonId.replace(/^S/, "")}`} · </span>}{gwLabel(m)} · {fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{m.kickOff && ` · ${m.kickOff}`}
          {scorers.length > 0 && <span className="hidden sm:inline"> · {scorers.map((s) => `${s.player.split(" ")[0]}${s.goals > 1 ? ` ×${s.goals}` : ""}`).join(", ")}</span>}
          {m.motm && <span className="hidden text-gold sm:inline"> · ★ {m.motm}</span>}
        </div>
      </div>
      <span className="display tabular text-right text-3xl leading-none text-ink">{m.played ? `${m.ourGoals}–${m.theirGoals}` : <span className="font-sans text-sm text-muted">{rel ?? m.kickOff ?? "TBC"}{rel && m.kickOff && <span className="block text-[11px] text-muted/80">{m.kickOff}</span>}</span>}</span>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function Crest({ size = 160, className }: { size?: number; className?: string }) {
  return <Image src="/crest.png" alt="Thameslink Hajduci crest" width={size} height={size} priority className={className} />;
}

/** Ranked list with proportional bars behind each row. CSS only, so it costs nothing on the client. */
export function LeaderList({ items, color = "bg-accent", format = (v: number) => String(v), emptyText = "Nothing to show yet" }: { items: { player: Player; value: number }[]; color?: string; format?: (v: number) => string; emptyText?: string }) {
  const max = items[0]?.value || 1;
  if (!items.length) return <p className="text-sm text-muted">{emptyText}</p>;
  return (
    <ol className="space-y-1">
      {items.map((x, i) => (
        <li key={x.player.slug} className="relative overflow-hidden rounded-lg">
          <span className={clsx("absolute inset-y-0 left-0 rounded-lg opacity-[0.07]", color)} style={{ width: `${Math.max(3, (x.value / max) * 100)}%` }} aria-hidden />
          <span className="relative flex items-center gap-3 px-3 py-1.5">
            <span className="tabular w-4 shrink-0 text-xs font-semibold text-muted">{i + 1}</span>
            <Avatar name={x.player.name} photo={x.player.extra.photo} size={28} />
            <PlayerLink name={x.player.name} player={x.player} className="min-w-0 truncate text-sm" />
            <span className="display tabular ml-auto shrink-0 text-2xl leading-none text-ink">{format(x.value)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Tag({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "gold" | "mint" | "loss"; className?: string }) {
  return <span className={clsx("chip", tone === "gold" && "border-gold/30 bg-gold/10 text-gold", tone === "mint" && "border-accent/25 bg-accent/10 text-accent", tone === "loss" && "border-loss/30 bg-loss/10 text-loss", tone === "default" && "text-muted", className)}>{children}</span>;
}

export function Callout({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="flex items-start gap-3 rounded-xl bg-sunken/70 px-4 py-3.5 text-sm leading-relaxed text-muted">{icon && <span className="mt-0.5 text-accent">{icon}</span>}<div>{children}</div></div>;
}
