"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeftRight, Shuffle } from "lucide-react";
import { fmtDate } from "@/lib/stats";
import { Avatar, Empty, Panel, Shirt, Stat, StatGrid, Tag } from "./ui";
import { Select } from "./controls";
import { ShareButton } from "./share-button";
import { btn } from "./button";

/** Compact per-player dataset built on the server; everything the duel needs and nothing it doesn't. */
export interface ComparePlayer {
  name: string; slug: string; photo?: string; nickname?: string; shirt: number | null; positions: string[];
  apps: number; goals: number; assists: number; motm: number; wins: number; draws: number; losses: number;
  goalsPerGame: number; assistsPerGame: number; gpgGames: number; apgGames: number; winRate: number;
  debut: string | null;
  seasons: { seasonId: string; apps: number; goals: number; assists: number }[];
  /** attendance(): apps as a share of counted games while on a season's roster */
  attendancePct: number; attendanceApps: number; attendancePossible: number;
  longestScoringRun: number;
  goalsInWins: number; consolation: number;
}
/** One counted game (friendlies and forfeits already removed) with who played, so with/without splits can be computed in the browser. */
export interface CompareMatch { id: string; result: "W" | "D" | "L"; ourGoals: number; theirGoals: number; date: string | null; players: string[] }

interface Metric { key: string; label: string; value: (p: ComparePlayer) => number | null; fmt: (v: number) => string; sub?: (p: ComparePlayer) => string | null }
const METRICS: Metric[] = [
  { key: "apps", label: "Appearances", value: (p) => p.apps, fmt: String, sub: (p) => (p.debut ? `since ${fmtDate(p.debut, { month: "short", year: "numeric" })}` : null) },
  { key: "goals", label: "Goals", value: (p) => p.goals, fmt: String },
  { key: "assists", label: "Assists", value: (p) => p.assists, fmt: String },
  { key: "gpg", label: "Goals a game", value: (p) => (p.gpgGames ? p.goalsPerGame : null), fmt: (v) => v.toFixed(2), sub: (p) => (p.gpgGames ? `${p.gpgGames} match${p.gpgGames === 1 ? "" : "es"} with scorers` : "no scorers recorded") },
  { key: "apg", label: "Assists a game", value: (p) => (p.apgGames ? p.assistsPerGame : null), fmt: (v) => v.toFixed(2), sub: (p) => (p.apgGames ? `${p.apgGames} match${p.apgGames === 1 ? "" : "es"} with assists` : "no assists recorded") },
  { key: "win", label: "Win rate", value: (p) => (p.wins + p.draws + p.losses ? p.winRate : null), fmt: (v) => `${Math.round(v)}%`, sub: (p) => `${p.wins}–${p.draws}–${p.losses}` },
  { key: "motm", label: "Man of the match", value: (p) => p.motm, fmt: String },
  { key: "att", label: "Attendance", value: (p) => (p.attendancePossible ? p.attendancePct : null), fmt: (v) => `${v}%`, sub: (p) => (p.attendancePossible ? `${p.attendanceApps} of ${p.attendancePossible} possible` : "not on a season roster") },
  { key: "run", label: "Longest scoring run", value: (p) => p.longestScoringRun, fmt: String, sub: (p) => (p.longestScoringRun ? `${p.longestScoringRun} match${p.longestScoringRun === 1 ? "" : "es"} in a row` : "never scored in consecutive matches") },
  { key: "gwins", label: "Goals in wins", value: (p) => (p.goals ? Math.round((p.goalsInWins / p.goals) * 100) : null), fmt: (v) => `${v}%`, sub: (p) => (p.goals ? `${p.goalsInWins} of ${p.goals} goals${p.consolation ? `, ${p.consolation} in defeats` : ""}` : "no goals to place") },
];

const firstName = (n: string) => n.split(" ")[0];
/** First name unless the two share one, in which case the full name does the disambiguating. */
const short = (p: ComparePlayer, other: ComparePlayer) => (firstName(p.name) === firstName(other.name) ? p.name : firstName(p.name));
const winPct = (xs: CompareMatch[]) => (xs.length ? Math.round((xs.filter((m) => m.result === "W").length / xs.length) * 100) : null);
const wdl = (xs: CompareMatch[]) => `${xs.filter((m) => m.result === "W").length}–${xs.filter((m) => m.result === "D").length}–${xs.filter((m) => m.result === "L").length}`;

interface Tally { a: number; b: number; ties: number; total: number }
function tally(a: ComparePlayer, b: ComparePlayer): Tally {
  const t: Tally = { a: 0, b: 0, ties: 0, total: 0 };
  for (const m of METRICS) {
    const va = m.value(a), vb = m.value(b);
    if (va === null || vb === null) continue;
    t.total++;
    if (va > vb) t.a++; else if (vb > va) t.b++; else t.ties++;
  }
  return t;
}

/** One plain sentence, computed from the numbers, safe for any pair: every branch guards its own denominators and there is always a fallback. */
function verdict(a: ComparePlayer, b: ComparePlayer, t: Tally): string {
  const A = short(a, b), B = short(b, a);
  const decidedA = a.wins + a.draws + a.losses, decidedB = b.wins + b.draws + b.losses;
  if (a.apps === 0 && b.apps === 0) return "Neither has played a league match yet.";
  if (a.apps === 0) return `${A} is yet to play a league match.`;
  if (b.apps === 0) return `${B} is yet to play a league match.`;
  if (a.goals > b.apps && b.apps >= 5) return `${A} has more goals than ${B} has appearances.`;
  if (b.goals > a.apps && a.apps >= 5) return `${B} has more goals than ${A} has appearances.`;
  if (a.assists >= 5 && b.apps >= 10 && a.assists > b.goals) return `${A} has set up more goals than ${B} has scored.`;
  if (b.assists >= 5 && a.apps >= 10 && b.assists > a.goals) return `${B} has set up more goals than ${A} has scored.`;
  if (a.goals === b.goals && a.apps === b.apps) return "Level on goals and appearances.";
  if (a.goals === b.goals && a.goals > 0 && a.apps !== b.apps) { const quicker = a.apps < b.apps ? A : B; return `Level on ${a.goals} goals, with ${quicker} getting there in ${Math.abs(a.apps - b.apps)} fewer match${Math.abs(a.apps - b.apps) === 1 ? "" : "es"}.`; }
  if (decidedA >= 10 && decidedB >= 10 && Math.abs(a.winRate - b.winRate) >= 15) { const w = a.winRate > b.winRate ? A : B; return `The team's win rate is ${Math.round(Math.abs(a.winRate - b.winRate))} points higher with ${w} playing.`; }
  if (a.motm >= 3 && b.motm === 0 && b.apps >= 10) return `${A} has ${a.motm} man of the match awards; ${B} is yet to win one.`;
  if (b.motm >= 3 && a.motm === 0 && a.apps >= 10) return `${B} has ${b.motm} man of the match awards; ${A} is yet to win one.`;
  if (a.gpgGames >= 10 && b.gpgGames >= 10 && a.goalsPerGame > 0 && a.goalsPerGame >= b.goalsPerGame * 2 && b.attendancePossible >= 10 && a.attendancePossible >= 10 && b.attendancePct > a.attendancePct) return `${A} scores twice as often; ${B} plays more often.`;
  if (a.gpgGames >= 10 && b.gpgGames >= 10 && b.goalsPerGame > 0 && b.goalsPerGame >= a.goalsPerGame * 2 && a.attendancePossible >= 10 && b.attendancePossible >= 10 && a.attendancePct > b.attendancePct) return `${B} scores twice as often; ${A} plays more often.`;
  if (t.total === 0) return "Not enough matches yet to compare them.";
  if (t.a === t.b) return `Level at ${t.a} categories each.`;
  const [w, l, wn, ln] = t.a > t.b ? [A, B, t.a, t.b] : [B, A, t.b, t.a];
  return `${w} leads ${l} in ${wn} categories to ${ln}.`;
}

function togetherLine(a: ComparePlayer, b: ComparePlayer, both: CompareMatch[], onlyA: CompareMatch[], onlyB: CompareMatch[]): string {
  const A = short(a, b), B = short(b, a);
  if (!both.length) return "They haven't played a league match together.";
  if (both.length < 3) return `${both.length} match${both.length === 1 ? "" : "es"} together so far.`;
  const t = winPct(both)!, sa = winPct(onlyA), sb = winPct(onlyB);
  const solos = [sa, sb].filter((x): x is number => x !== null);
  if (!solos.length) return `${both.length} matches together, and none apart.`;
  return `Won ${t}% together; ${sa === null ? "no matches" : `${sa}%`} with ${A} alone and ${sb === null ? "no matches" : `${sb}%`} with ${B} alone.`;
}

function Head({ p, other, align, tone }: { p: ComparePlayer; other: ComparePlayer; align: "left" | "right"; tone: "lead" | "trail" | "level" }) {
  const right = align === "right";
  return (
    <div className={clsx("flex min-w-0 flex-col gap-3", right ? "items-end text-right" : "items-start text-left")}>
      {p.photo ? <Avatar name={p.name} photo={p.photo} size={88} shirt={p.shirt} priority /> : <Shirt number={p.shirt} name={p.name} className="h-[88px] w-20" />}
      <div className="min-w-0">
        <p className="eyebrow truncate">{p.positions.length ? p.positions.join(" · ") : "Squad player"}{p.shirt !== null ? ` · Number ${p.shirt}` : ""}</p>
        <h2 className="display break-words text-2xl leading-none text-ink sm:text-5xl">{p.name}</h2>
        {p.nickname && <p className="mt-0.5 truncate text-sm italic text-muted">“{p.nickname}”</p>}
        <div className={clsx("mt-2 flex flex-wrap gap-1.5", right && "justify-end")}>
          <Tag>Debut {fmtDate(p.debut, { month: "short", year: "numeric" })}</Tag>
          </div>
        <Link href={`/squad/${p.slug}`} className="link focus-ring mt-2 inline-block rounded text-sm">Profile</Link>
        <span className="sr-only">{tone === "lead" ? `Leads ${short(other, p)} in more categories` : tone === "trail" ? `Trails ${short(other, p)} in more categories` : "Level on categories"}</span>
      </div>
    </div>
  );
}

function Bars({ a, b, m }: { a: ComparePlayer; b: ComparePlayer; m: Metric }) {
  const va = m.value(a), vb = m.value(b);
  const max = Math.max(va ?? 0, vb ?? 0);
  const w = (v: number | null) => (v === null || max === 0 ? 0 : Math.max(v > 0 ? 3 : 0, (v / max) * 100));
  const aBetter = va !== null && (vb === null || va > vb), bBetter = vb !== null && (va === null || vb > va);
  const level = va !== null && vb !== null && va === vb;
  const nA = short(a, b), nB = short(b, a);
  // Mint is colour-only, so each number is prefixed with whose it is and the better one says so, for screen readers.
  const val = (v: number | null, better: boolean, name: string) => <span className={clsx("display text-2xl leading-none sm:text-3xl", better ? "text-accent" : v === null ? "text-muted" : "text-ink/70")}><span className="sr-only">{name}: </span>{v === null ? "–" : m.fmt(v)}{better && <span className="sr-only"> (leads)</span>}</span>;
  const bar = (better: boolean) => clsx("h-full rounded-full transition-[width] duration-500", better ? "bg-accent" : level ? "bg-ink/40" : "bg-ink/25");
  const subA = m.sub?.(a), subB = m.sub?.(b);
  return (
    <li className="py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-2">
        {val(va, aBetter, nA)}
        <span className="text-center"><span className="eyebrow">{m.label}</span>{level && <span className="ml-1 text-2xs text-muted">(level)</span>}</span>
        <span className="justify-self-end">{val(vb, bBetter, nB)}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1" aria-hidden>
        <div className="flex h-2 justify-end overflow-hidden rounded-l-full bg-ink/[0.06]"><span className={bar(aBetter)} style={{ width: `${w(va)}%` }} /></div>
        <div className="flex h-2 overflow-hidden rounded-r-full bg-ink/[0.06]"><span className={bar(bBetter)} style={{ width: `${w(vb)}%` }} /></div>
      </div>
      {(subA || subB) && <div className="mt-1 flex justify-between gap-3 text-2xs text-muted"><span className="min-w-0 truncate">{subA && <><span className="sr-only">{nA}: </span>{subA}</>}</span><span className="min-w-0 truncate text-right">{subB && <><span className="sr-only">{nB}: </span>{subB}</>}</span></div>}
    </li>
  );
}

export function Compare({ players, matches, seasons, initialA, initialB }: { players: ComparePlayer[]; matches: CompareMatch[]; seasons: string[]; initialA: string; initialB: string }) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const bySlug = useMemo(() => new Map(players.map((p) => [p.slug, p])), [players]);
  const A = bySlug.get(a) ?? players[0], B = bySlug.get(b) ?? players[1] ?? players[0];

  useEffect(() => {
    // Keep the address bar shareable. Next's router listens to replaceState, so useSearchParams elsewhere stays in sync too.
    const url = new URL(window.location.href);
    if (url.searchParams.get("a") === a && url.searchParams.get("b") === b) return;
    url.searchParams.set("a", a); url.searchParams.set("b", b);
    window.history.replaceState(null, "", url.toString());
  }, [a, b]);

  const options = players.map((p) => ({ value: p.slug, label: `${p.name} · ${p.apps} appearance${p.apps === 1 ? "" : "s"}` }));
  // Picking the other side's player swaps them rather than comparing someone with himself.
  const pickA = (v: string) => { if (v === b) setB(a); setA(v); };
  const pickB = (v: string) => { if (v === a) setA(b); setB(v); };
  const swap = () => { setA(b); setB(a); };
  const shuffle = () => {
    const pool = players.filter((p) => p.apps >= 5); const src = pool.length >= 2 ? pool : players;
    if (src.length < 2) return;
    let x = src[Math.floor(Math.random() * src.length)], y = src[Math.floor(Math.random() * src.length)];
    let guard = 0; while ((y.slug === x.slug || (x.slug === a && y.slug === b)) && guard++ < 20) { x = src[Math.floor(Math.random() * src.length)]; y = src[Math.floor(Math.random() * src.length)]; }
    if (x.slug !== y.slug) { setA(x.slug); setB(y.slug); }
  };

  const t = useMemo(() => tally(A, B), [A, B]);
  const line = verdict(A, B, t);
  const { both, onlyA, onlyB } = useMemo(() => {
    const has = (m: CompareMatch, n: string) => m.players.includes(n);
    return { both: matches.filter((m) => has(m, A.name) && has(m, B.name)), onlyA: matches.filter((m) => has(m, A.name) && !has(m, B.name)), onlyB: matches.filter((m) => has(m, B.name) && !has(m, A.name)) };
  }, [matches, A.name, B.name]);
  const seasonRows = seasons.map((sid) => ({ sid, a: A.seasons.find((s) => s.seasonId === sid), b: B.seasons.find((s) => s.seasonId === sid) })).filter((r) => (r.a?.apps ?? 0) > 0 || (r.b?.apps ?? 0) > 0);
  const shared = seasonRows.filter((r) => (r.a?.apps ?? 0) > 0 && (r.b?.apps ?? 0) > 0).length;
  const sA = short(A, B), sB = short(B, A);
  const toneA = t.a > t.b ? "lead" : t.b > t.a ? "trail" : "level", toneB = t.b > t.a ? "lead" : t.a > t.b ? "trail" : "level";
  const shareText = `${A.name} v ${B.name}: ${A.goals} goal${A.goals === 1 ? "" : "s"} in ${A.apps} appearance${A.apps === 1 ? "" : "s"} against ${B.goals} in ${B.apps}. ${line}`;
  const cell = (label: string, xs: CompareMatch[]) => {
    const pct = winPct(xs);
    return <Stat variant="well" align="center" size="sm" label={label} value={pct === null ? <span className="text-muted">–</span> : `${pct}%`} sub={<>{xs.length} match{xs.length === 1 ? "" : "es"}{xs.length > 0 && <span className="block tabular">{wdl(xs)}</span>}</>} />;
  };

  if (players.length < 2) return <Empty>At least two players are needed to compare.</Empty>;

  return (
    <div className="space-y-6">
      <div className="card card-pad">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Select label="Player" value={A.slug} onChange={pickA} options={options} />
          <button type="button" onClick={swap} className={btn("secondary", "sm", "px-3")} aria-label="Swap sides"><ArrowLeftRight size={14} aria-hidden /><span className="sm:hidden">Swap sides</span></button>
          <Select label="Compared with" value={B.slug} onChange={pickB} options={options} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={shuffle} className={btn("secondary", "xs")}><Shuffle size={14} aria-hidden />Random pair</button>
          <ShareButton title={`${A.name} v ${B.name} · Thameslink Hajduci`} text={shareText} />
        </div>
      </div>

      <section className="card card-pad relative overflow-hidden" aria-label={`${A.name} and ${B.name}`}>
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
          <Head p={A} other={B} align="left" tone={toneA} />
          <div className="flex flex-col items-center self-center">
            <span className="display text-3xl italic leading-none text-muted sm:text-5xl" aria-hidden>v</span>
            <span className="display mt-3 text-2xl leading-none text-ink sm:text-3xl" title="Categories led">{t.a}–{t.b}</span>
            <span className="eyebrow eyebrow-sm mt-1">categories</span>
          </div>
          <Head p={B} other={A} align="right" tone={toneB} />
        </div>
        <p className="display relative mt-6 border-t border-ink/10 pt-5 text-center text-xl italic text-ink/85 sm:text-2xl">{line}</p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Panel title="Head to head" sub="The stronger figure in each row is highlighted" as="div" className="lg:col-span-3">
          <div className="flex justify-between text-xs font-semibold text-ink"><span className="truncate">{sA}</span><span className="truncate text-right">{sB}</span></div>
          <ol className="divide-y divide-ink/[0.06]">{METRICS.map((m) => <Bars key={m.key} a={A} b={B} m={m} />)}</ol>
        </Panel>

        <div className="lg:col-span-2 space-y-6 lg:flex lg:flex-col lg:space-y-0 lg:gap-6 lg:[&>*:last-child]:flex-1">
          <Panel title="Together" sub="The team's win rate with both, and with each alone" as="div">
            <StatGrid className="grid-cols-3 gap-2">
              {cell("Together", both)}
              {cell(`${sA} only`, onlyA)}
              {cell(`${sB} only`, onlyB)}
            </StatGrid>
            <p className="mt-3 text-sm text-muted">{togetherLine(A, B, both, onlyA, onlyB)}</p>
            {both.length > 0 && <p className="mt-2 text-xs text-muted">Last together <Link href={`/matches/${both[both.length - 1].id}`} className="link">{fmtDate(both[both.length - 1].date)}</Link> · {shared} season{shared === 1 ? "" : "s"} together</p>}
          </Panel>

          <Panel flush title="Season by season" sub="Appearances and goals" as="div">
            {seasonRows.length ? (
              <div className="scroll-x overflow-x-auto">
                <table className="stats w-full">
                  <thead>
                    <tr><th aria-hidden /><th colSpan={2} className="text-center text-ink">{sA}</th><th colSpan={2} className="text-center text-ink">{sB}</th></tr>
                    <tr><th>Season</th><th title="Appearances" className="text-center">P</th><th title="Goals" className="text-center">G</th><th title="Appearances" className="text-center">P</th><th title="Goals" className="text-center">G</th></tr>
                  </thead>
                  <tbody>
                    {seasonRows.map((r) => { const ga = r.a?.goals ?? 0, gb = r.b?.goals ?? 0; return (
                      <tr key={r.sid}>
                        <td className="font-medium text-ink"><Link href={`/seasons/${r.sid.toLowerCase()}`} className="link">Season {r.sid.replace(/^S/, "")}</Link></td>
                        <td className={clsx("tabular text-center", !r.a?.apps && "text-muted")}>{r.a?.apps ?? 0}</td><td className={clsx("tabular text-center font-semibold", ga > gb ? "text-ink" : ga ? "text-ink/70" : "text-muted")}>{ga}</td>
                        <td className={clsx("tabular text-center", !r.b?.apps && "text-muted")}>{r.b?.apps ?? 0}</td><td className={clsx("tabular text-center font-semibold", gb > ga ? "text-ink" : gb ? "text-ink/70" : "text-muted")}>{gb}</td>
                      </tr>); })}
                    <tr className="font-semibold"><td className="text-ink">Total</td><td className="tabular text-center">{A.apps}</td><td className="tabular text-center">{A.goals}</td><td className="tabular text-center">{B.apps}</td><td className="tabular text-center">{B.goals}</td></tr>
                  </tbody>
                </table>
              </div>
            ) : <Empty inset>No seasons yet.</Empty>}
          </Panel>
        </div>
      </section>
    </div>
  );
}
