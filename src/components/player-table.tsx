"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

export type PlayerRow = { name: string; slug: string; apps: number; goals: number; assists: number; motm: number; champagne: number; wins: number; draws: number; losses: number; goalsPerGame: number; winRate: number; ppg: number };
type Key = keyof Omit<PlayerRow, "slug">;
const COLS: { key: Key; label: string; title?: string; num?: boolean }[] = [
  { key: "name", label: "Player" }, { key: "apps", label: "P", title: "Appearances", num: true }, { key: "goals", label: "G", title: "Goals", num: true }, { key: "assists", label: "A", title: "Assists", num: true },
  { key: "goalsPerGame", label: "G/G", title: "Goals per game", num: true }, { key: "motm", label: "MOTM", title: "Man of the match awards", num: true }, { key: "champagne", label: "🍾", title: "Champagne moments", num: true },
  { key: "wins", label: "W", num: true }, { key: "draws", label: "D", num: true }, { key: "losses", label: "L", num: true }, { key: "ppg", label: "PPG", title: "Points per game (3W + 1D)", num: true }, { key: "winRate", label: "Win %", num: true },
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
          <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={clsx("focus-ring chip cursor-pointer", scope === "all" ? "border-mint/50 bg-mint/15 text-mint-soft" : "text-ash hover:text-cream")}>All-time</button>
          {seasons.map((s) => <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={clsx("focus-ring chip cursor-pointer", scope === s ? "border-mint/50 bg-mint/15 text-mint-soft" : "text-ash hover:text-cream")}>{s}</button>)}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-ash"><input type="checkbox" checked={minApps} onChange={(e) => setMinApps(e.target.checked)} className="accent-mint" />Hide players with fewer than 5 apps</label>
      </div>
      <div className="card overflow-x-auto">
        <table className="stats min-w-[820px]">
          <thead>
            <tr>
              <th className="w-8">#</th>
              {COLS.map((c) => (
                <th key={c.key} className={clsx(c.num && "num")} aria-sort={sort.key === c.key ? (sort.dir === -1 ? "descending" : "ascending") : undefined}>
                  <button type="button" onClick={() => click(c.key)} title={c.title} className={clsx("focus-ring inline-flex items-center gap-1 rounded uppercase tracking-[0.16em] hover:text-cream", sort.key === c.key && "text-mint-soft")}>{c.label}<span aria-hidden className="text-[9px]">{sort.key === c.key ? (sort.dir === -1 ? "▼" : "▲") : ""}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug}>
                <td className="text-ash">{i + 1}</td>
                <td><Link href={`/squad/${r.slug}`} className="link font-medium text-cream">{r.name}</Link></td>
                <td className="num">{r.apps}</td><td className="num font-semibold text-cream">{r.goals}</td><td className="num">{r.assists}</td><td className="num">{r.goalsPerGame.toFixed(2)}</td>
                <td className="num">{r.motm || ""}</td><td className="num">{r.champagne || ""}</td>
                <td className="num text-mint-soft">{r.wins}</td><td className="num text-[#ffe27a]">{r.draws}</td><td className="num text-[#ff9a9d]">{r.losses}</td>
                <td className="num">{r.ppg.toFixed(2)}</td><td className="num font-semibold text-cream">{r.winRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-4 py-8 text-center text-sm text-ash">No players in this scope yet.</p>}
      </div>
    </div>
  );
}
