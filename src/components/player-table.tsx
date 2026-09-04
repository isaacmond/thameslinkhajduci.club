"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Switch } from "./controls";

export type PlayerRow = { name: string; slug: string; apps: number; goals: number; assists: number; motm: number; wins: number; draws: number; losses: number; goalsPerGame: number; assistsPerGame: number; gpgGames: number; apgGames: number; winRate: number; ppg: number };
type Key = keyof Omit<PlayerRow, "slug">;
const COLS: { key: Key; label: string; title?: string; num?: boolean; hide?: string }[] = [
  { key: "name", label: "Player" }, { key: "apps", label: "P", title: "Appearances", num: true }, { key: "goals", label: "G", title: "Goals", num: true }, { key: "assists", label: "A", title: "Assists", num: true },
  { key: "goalsPerGame", label: "G/G", title: "Goals per game (games with scorers logged)", num: true }, { key: "assistsPerGame", label: "A/G", title: "Assists per game (games with assists logged)", num: true, hide: "hidden md:table-cell" }, { key: "motm", label: "MOTM", title: "Man of the match awards", num: true, hide: "hidden md:table-cell" },
  { key: "wins", label: "W", num: true }, { key: "draws", label: "D", num: true, hide: "hidden md:table-cell" }, { key: "losses", label: "L", num: true }, { key: "ppg", label: "PPG", title: "Points per game (3W + 1D)", num: true, hide: "hidden md:table-cell" }, { key: "winRate", label: "Win %", num: true },
];

export function PlayerTable({ datasets, seasons }: { datasets: Record<string, PlayerRow[]>; seasons: string[] }) {
  const [scope, setScope] = useState<string>("all");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "apps", dir: -1 });
  const [minApps, setMinApps] = useState(false);
  const rows = useMemo(() => {
    const src = (datasets[scope] ?? []).filter((r) => !minApps || r.apps >= 5);
    return [...src].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const c = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
      return (c || b.apps - a.apps) * (sort.key === "name" ? -sort.dir : sort.dir);
    });
  }, [datasets, scope, sort, minApps]);
  const click = (key: Key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Scope">
          <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={clsx("focus-ring chip chip-tap cursor-pointer whitespace-nowrap transition-colors", scope === "all" ? "border-mint/50 bg-mint/15 text-mint-soft" : "text-ash hover:text-cream")}>All-time</button>
          {seasons.map((s) => <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={clsx("focus-ring chip chip-tap cursor-pointer whitespace-nowrap transition-colors", scope === s ? "border-mint/50 bg-mint/15 text-mint-soft" : "text-ash hover:text-cream")}>{s}</button>)}
        </div>
        <Switch className="ml-auto" checked={minApps} onChange={setMinApps} label="Hide players with fewer than 5 apps" />
      </div>
      <div className="scroll-x card overflow-x-auto">
        <table className="stats w-full md:min-w-[820px]">
          <thead>
            <tr>
              <th className="hidden w-8 sm:table-cell">#</th>
              {COLS.map((c) => (
                <th key={c.key} className={clsx(c.num && "num", c.hide)} aria-sort={sort.key === c.key ? (sort.dir === -1 ? "descending" : "ascending") : undefined}>
                  <button type="button" onClick={() => click(c.key)} title={c.title} className={clsx("focus-ring inline-flex items-center gap-1 rounded uppercase tracking-[0.16em] hover:text-cream", sort.key === c.key && "text-mint-soft")}>{c.label}<span aria-hidden className="text-[9px]">{sort.key === c.key ? (sort.dir === -1 ? "▼" : "▲") : ""}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug}>
                <td className="hidden text-ash sm:table-cell">{i + 1}</td>
                <td><Link href={`/squad/${r.slug}`} className="link block max-w-[8rem] truncate font-medium text-cream sm:max-w-none">{r.name}</Link></td>
                <td className="num">{r.apps}</td><td className="num font-semibold text-cream">{r.goals}</td><td className="num">{r.assists}</td><td className="num" title={`${r.goals} goals over ${r.gpgGames} games with scorers logged`}>{r.goalsPerGame.toFixed(2)}</td><td className="num hidden md:table-cell" title={`${r.assists} assists over ${r.apgGames} games with assists logged`}>{r.assistsPerGame.toFixed(2)}</td>
                <td className="num hidden md:table-cell">{r.motm || ""}</td>
                <td className="num text-mint-soft">{r.wins}</td><td className="num hidden text-draw-soft md:table-cell">{r.draws}</td><td className="num text-loss-soft">{r.losses}</td>
                <td className="num hidden md:table-cell">{r.ppg.toFixed(2)}</td><td className="num font-semibold text-cream">{r.winRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-4 py-8 text-center text-sm text-ash">No players in this scope yet.</p>}
      </div>
      <p className="mt-2 text-xs text-ash">G/G and A/G divide by the games where scorers (or assists) were actually written down, not raw appearances, so they can look higher than goals ÷ apps. Hover a value for its denominator. PPG is 3 for a win and 1 for a draw.</p>
    </div>
  );
}
