import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { ArrowRight, Check, Star } from "lucide-react";
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

/**
 * The one heading for a section or card: optional eyebrow, the title, an optional line under it, and an optional link, tag
 * or control on the right. The right-hand item is centred on the title line, so it sits at the same height in cards side by
 * side whatever their sub lines say, and wraps under the title when there is no room. `sm` is the smaller title used for cards in a dense grid;
 * `bare` drops the space under it, for a heading that is the whole of its block.
 */
export function SectionTitle({ children, sub, right, id, eyebrow, size = "md", as: As = "h2", bare = false, className }: { children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; id?: string; eyebrow?: React.ReactNode; size?: "md" | "sm"; as?: "h2" | "h3"; bare?: boolean; className?: string }) {
  return (
    <div className={clsx(bare ? "" : size === "sm" ? "mb-3" : "mb-4", className)}>
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <As id={id} className={clsx("display min-w-0 text-ink", size === "sm" ? "text-2xl leading-tight" : "text-[1.75rem] leading-tight")}>{children}</As>
        {right && <div className="max-w-full shrink-0">{right}</div>}
      </div>
      {sub && <p className={clsx("mt-1 text-muted", size === "sm" ? "text-xs" : "text-sm")}>{sub}</p>}
    </div>
  );
}

/**
 * A card with a heading. Header and body share the card inset (`--card-px`), which is also the inset of a table's first and
 * last columns, so a title, its rows and a table underneath all start on the same line. `flush` lets the body run edge to edge
 * (tables, strips, lists of rows that carry their own inset).
 */
export function Panel({ title, sub, right, eyebrow, size, id, heading, flush = false, as: As = "section", className, bodyClassName, children }: { title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; eyebrow?: React.ReactNode; size?: "md" | "sm"; id?: string; heading?: "h2" | "h3"; flush?: boolean; as?: "section" | "div" | "article"; className?: string; bodyClassName?: string; children?: React.ReactNode }) {
  return (
    <As className={clsx("card min-w-0", flush && "overflow-hidden", className)}>
      {title && <div className={clsx("card-x pt-(--card-px)", flush && "pb-2")}><SectionTitle id={id} as={heading} sub={sub} right={right} eyebrow={eyebrow} size={size}>{title}</SectionTitle></div>}
      {flush ? children : <div className={clsx("card-x pb-(--card-px)", !title && "pt-(--card-px)", bodyClassName)}>{children}</div>}
    </As>
  );
}

export const arrowLinkClass = "link inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded text-sm font-medium";
/** A text link with an arrow, for "see all" and "details" links. It never wraps, so the arrow stays on the line. Without `href` it is the look alone, for use inside a larger link (a whole card). */
export function ArrowLink({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const inner = <>{children}<ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden /></>;
  return href ? <Link href={href} className={clsx("focus-ring", arrowLinkClass, className)}>{inner}</Link> : <span className={clsx(arrowLinkClass, "hover:no-underline", className)}>{inner}</span>;
}

/** An icon beside text that may wrap: the icon sits centred on the first line, whatever the font size. */
export function IconText({ icon, children, className, gap = "gap-2" }: { icon: React.ReactNode; children: React.ReactNode; className?: string; gap?: string }) {
  return <span className={clsx("flex items-start", gap, className)}><span className="icon-line" aria-hidden>{icon}</span><span className="min-w-0">{children}</span></span>;
}

/**
 * A label, a figure and an optional note. `card` stands on its own; `well` is the tinted tile used inside another card.
 * Put several in a <StatGrid> and their labels, figures and notes share rows, so a label that wraps never knocks one
 * figure out of line with its neighbours. `money`: amounts use the body typeface with tabular figures, matching the money tables.
 */
export function Stat({ label, value, sub, tone = "default", size = "md", money = false, variant = "card", align = "left", className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "win" | "draw" | "loss" | "gold" | "accent" | "muted"; size?: "xs" | "sm" | "md" | "lg"; money?: boolean; variant?: "card" | "well"; align?: "left" | "center"; className?: string }) {
  return (
    <div className={clsx("stat h-full", variant === "card" ? "card" : "well", size === "sm" ? "p-3" : "p-4", align === "center" && "text-center", className)}>
      <p className={clsx("eyebrow leading-snug", size === "sm" && "eyebrow-sm")}>{label}</p>
      <p className={clsx("tabular self-start leading-none", money ? "font-semibold tracking-tight" : "display", money ? (size === "lg" ? "mt-2 text-4xl" : size === "sm" ? "mt-1.5 text-2xl" : "mt-2 text-3xl") : size === "lg" ? "mt-2 text-5xl" : size === "sm" ? "mt-1.5 text-3xl" : size === "xs" ? "mt-1.5 text-2xl leading-tight" : "mt-2 text-4xl", tone === "win" && "text-win", tone === "loss" && "text-loss", tone === "draw" && "text-draw", tone === "gold" && "text-gold", tone === "accent" && "text-accent", tone === "muted" && "text-muted", tone === "default" && "text-ink")}>{value}</p>
      {sub ? <p className={clsx("mt-1.5 text-muted", size === "sm" ? "text-2xs" : "text-xs")}>{sub}</p> : <span aria-hidden />}
    </div>
  );
}

/** A row (or grid) of <Stat>s whose labels, figures and notes line up across each row. Pass the column and gap classes. */
export function StatGrid({ children, className, as: As = "div", label }: { children: React.ReactNode; className?: string; as?: "div" | "section"; label?: string }) {
  return <As className={clsx("stat-grid", className)} aria-label={label}>{children}</As>;
}

/**
 * Figures in a row with their labels underneath: the club record, a player's totals, the squad card footer.
 * `divided` draws a rule between cells. Sizes keep one scale for figure, label and padding across the site.
 */
export function StatStrip({ items, size = "md", divided = false, money = false, className }: { items: { label: React.ReactNode; value: React.ReactNode; title?: string }[]; size?: "sm" | "md" | "lg"; divided?: boolean; money?: boolean; className?: string }) {
  return (
    <dl className={clsx("grid text-center", divided && "divide-x divide-ink/10", className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => (
        <div key={i} className={clsx("flex min-w-0 flex-col-reverse", size === "sm" ? "px-0.5 py-2.5" : size === "md" ? "py-4" : "py-5")} title={it.title}>
          <dt className={clsx("eyebrow truncate", size === "sm" ? "eyebrow-sm mt-1" : "mt-2")}>{it.label}</dt>
          <dd className={clsx("tabular leading-none text-ink", money ? "font-semibold tracking-tight" : "display", money ? (size === "sm" ? "text-xl" : size === "md" ? "text-2xl" : "text-3xl") : size === "sm" ? "text-2xl" : size === "md" ? "text-4xl" : "text-4xl sm:text-5xl")}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A record: label, a large figure with an optional muted unit ("6 goals"), and a line of detail. The label keeps two lines from sm up, where cards sit side by side, so figures line up across a row; `compact` drops that from lg up, where short labels fit on one line. */
export function RecordCard({ label, value, unit, sub, href, compact = false }: { label: string; value: React.ReactNode; unit?: React.ReactNode; sub?: React.ReactNode; href?: string; compact?: boolean }) {
  const head = (
    <>
      <span className={clsx("eyebrow block leading-snug sm:min-h-[2lh]", compact && "lg:min-h-0")}>{label}</span>
      <span className="display mt-3 block whitespace-nowrap text-5xl leading-none text-ink">{value}{unit && <> <span className="text-2xl text-muted">{unit}</span></>}</span>
    </>
  );
  return (
    <div className={clsx("card card-pad h-full", href && "card-link")}>
      {href ? <Link href={href} className="focus-ring block rounded-lg">{head}</Link> : head}
      {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
    </div>
  );
}

/** Played, won, drawn, lost, with goals underneath. Compact enough for phones; used on home, season and player pages. */
export function RecordStrip({ s, className, animate = false }: { s: SeasonSummary; className?: string; animate?: boolean }) {
  const cells: [string, number][] = [["Played", s.played], ["Won", s.won], ["Drawn", s.drawn], ["Lost", s.lost]];
  return (
    <div className={className}>
      <StatStrip size="lg" divided items={cells.map(([k, v]) => ({ label: k, value: animate ? <CountUp value={v} /> : v }))} />
      <p className="card-x border-t border-ink/10 py-2.5 text-center text-xs text-muted"><span className="nowrap">Scored <span className="font-medium text-ink">{s.goalsFor}</span></span> · <span className="nowrap">Conceded <span className="font-medium text-ink">{s.goalsAgainst}</span></span> · <span className="nowrap">Difference <span className="font-medium text-ink">{signed(s.goalsFor - s.goalsAgainst)}</span></span> · <span className="nowrap"><span className="font-medium text-ink">{ppg(s).toFixed(2)}</span> points a game</span></p>
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
      <text x="100" dx={surname.length > 7 ? 0 : 1.5} y="84" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing={surname.length > 7 ? 1 : 3} fill="rgba(245,241,232,0.8)" style={{ fontFamily: "var(--font-sans)" }} {...(surname.length > 7 ? { textLength: 80, lengthAdjust: "spacingAndGlyphs" } : {})}>{surname}</text>
      <text x="100" y="176" textAnchor="middle" fontSize={number !== null && number >= 10 ? 92 : 100} fill="#f5f1e8" style={{ fontFamily: "var(--font-display)" }}>{number ?? "?"}</text>
    </svg>
  );
}

/** Sizes for every round mark (result pills, fixture numbers, timeline stops), so they share one scale. */
export const ROUND = { xs: "h-5 w-5 text-3xs", sm: "h-6 w-6 text-2xs", md: "h-7 w-7 text-xs", lg: "h-9 w-9 text-sm" } as const;

export function ResultPill({ result, className, size = "md" }: { result: Result | null; className?: string; size?: keyof typeof ROUND }) {
  const r = result ?? "X";
  return <span className={clsx("pill-round font-sans", `result-${r}`, ROUND[size], className)} aria-label={result === "W" ? "Win" : result === "D" ? "Draw" : result === "L" ? "Loss" : "Not played"}>{r === "X" ? "–" : r}</span>;
}

export function FormStrip({ matches, size = "md" }: { matches: (Match | MatchLite)[]; size?: "sm" | "md" }) {
  return (
    <div className="flex gap-1" aria-label="Recent form">
      {matches.map((m) => <Link key={m.id} href={`/matches/${m.id}`} title={`${fmtDate(m.date)} · ${m.opponent} ${scoreline(m)}`} className="focus-ring -m-1 rounded-full p-1"><ResultPill result={m.result} size={size} /></Link>)}
      {!matches.length && <span className="text-xs text-muted">No matches yet</span>}
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
      {shirt !== undefined && shirt !== null && <span className={clsx("tabular absolute inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-3xs font-bold leading-none text-paper ring-2 ring-surface", size >= 64 ? "bottom-[6%] right-[6%]" : "-bottom-1 -right-1")}>{shirt}</span>}
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
      {m.played ? <ResultPill result={m.result} size="lg" /> : <span className="pill-round h-9 w-9 bg-ink/[0.04] text-3xs font-semibold text-muted" aria-label={gwLabel(m)}>{m.seasonId === "FR" ? "F" : "GW"}{m.gw}</span>}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-x-2">
          <TeamBadge name={m.opponent} size={20} className="shrink-0" />
          <span className="min-w-0 truncate font-semibold text-ink" title={m.opponent}>{m.opponent}</span>
          {m.type && <Tag size="sm" className="shrink-0">{m.type}</Tag>}
        </div>
        <div className="mt-0.5 text-xs leading-4 text-muted">
          {showSeason && <span className="font-medium text-ink/70">{m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonId.replace(/^S/, "")}`} · </span>}{gwLabel(m)} · <span className="whitespace-nowrap">{fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{m.played && m.kickOff && ` · ${m.kickOff}`}</span>
        </div>
        {(scorers.length > 0 || m.motm) && (
          <div className="mt-0.5 hidden truncate text-xs leading-4 text-muted sm:block">
            {scorers.length > 0 && <span>{scorers.map((s) => `${s.player}${s.goals > 1 ? ` (${s.goals})` : ""}`).join(", ")}</span>}
            {m.motm && <span className="text-gold">{scorers.length > 0 && " · "}<MotmStar className="icon-inline mr-0.5" /> {m.motm}</span>}
          </div>
        )}
      </div>
      {m.played
        ? <span className="tabular text-right text-2xl font-semibold leading-none tracking-tight text-ink">{m.ourGoals}–{m.theirGoals}</span>
        : <span className="self-start text-right text-sm leading-6 text-muted">{rel ?? m.kickOff ?? "TBC"}{rel && m.kickOff && <span className="mt-0.5 block text-xs leading-4">{m.kickOff}</span>}</span>}
    </Link>
  );
}

/** An empty state. On its own it is a card; `inset` sits inside a card under its title. */
export function Empty({ children, inset = false, className }: { children: React.ReactNode; inset?: boolean; className?: string }) {
  return <p className={clsx(inset ? "card-x pb-(--card-px) text-sm text-muted" : "card px-4 py-8 text-center text-sm text-muted", className)}>{children}</p>;
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
          {/* the name's line is as tall as the avatar, so the baseline-aligned rank, name and figure sit in the middle of the bar */}
          <span className="relative flex items-baseline gap-3 px-3 py-1.5">
            <span className="tabular w-4 shrink-0 text-xs font-semibold text-muted">{i + 1}</span>
            <span className="self-center"><Avatar name={x.player.name} photo={x.player.extra.photo} size={28} /></span>
            <PlayerLink name={x.player.name} player={x.player} className="min-w-0 truncate text-sm leading-7" />
            <span className="tabular ml-auto shrink-0 text-lg font-semibold leading-none text-ink">{format(x.value)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A labelled chip. `sm` is the compact one that sits beside a name in a row or a table cell. */
export function Tag({ children, tone = "default", size = "md", className }: { children: React.ReactNode; tone?: "default" | "gold" | "accent" | "win" | "loss"; size?: "sm" | "md"; className?: string }) {
  return <span className={clsx("chip", size === "sm" && "chip-sm", tone === "gold" && "border-gold/30 bg-gold/10 text-gold", tone === "accent" && "border-accent/25 bg-accent/10 text-accent", tone === "win" && "border-win/30 bg-win/10 text-win", tone === "loss" && "border-loss/30 bg-loss/10 text-loss", tone === "default" && "text-muted", className)}>{children}</span>;
}

/** The tick on a selectable tile (team sheet, pitch fees, ballot): accent for a pick, gold for a man-of-the-match vote. */
export function Tick({ on, tone = "accent", hint = false }: { on: boolean; tone?: "accent" | "gold"; hint?: boolean }) {
  return <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? (tone === "gold" ? "border-gold bg-gold text-paper" : "border-accent bg-accent text-paper") : hint ? "border-accent" : "border-ink/20")} aria-hidden>{on && <Check size={12} />}</span>;
}

/** The one man-of-the-match mark: a small filled gold star. */
export function MotmStar({ className, label }: { className?: string; label?: string }) {
  return <Star size={12} className={clsx("inline-block shrink-0 fill-current text-gold", className)} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} />;
}

export function Callout({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="well flex items-start gap-3 px-4 py-3.5 text-sm leading-relaxed text-muted">{icon && <span className="icon-line text-accent">{icon}</span>}<div className="min-w-0">{children}</div></div>;
}
