"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { chipToggle, Switch } from "./controls";
import { Empty } from "./ui";

export type PlayerRow = { name: string; slug: string; apps: number; goals: number; assists: number; motm: number; wins: number; draws: number; losses: number; goalsPerGame: number; assistsPerGame: number; gpgGames: number; apgGames: number; winRate: number; ppg: number };
type Key = keyof Omit<PlayerRow, "slug">;
const COLS: { key: Key; label: string; title?: string; num?: boolean; hide?: string }[] = [
  { key: "name", label: "Player" }, { key: "apps", label: "P", title: "Appearances", num: true }, { key: "goals", label: "G", title: "Goals", num: true }, { key: "assists", label: "A", title: "Assists", num: true },
  { key: "goalsPerGame", label: "G/G", title: "Goals a game", num: true }, { key: "assistsPerGame", label: "A/G", title: "Assists a game", num: true, hide: "hidden md:table-cell" }, { key: "motm", label: "MOTM", title: "Man of the match awards", num: true, hide: "hidden md:table-cell" },
  { key: "wins", label: "W", num: true }, { key: "draws", label: "D", num: true, hide: "hidden md:table-cell" }, { key: "losses", label: "L", num: true }, { key: "ppg", label: "PPG", title: "Points a game", num: true, hide: "hidden md:table-cell" }, { key: "winRate", label: "Win %", num: true },
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
          <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={chipToggle(scope === "all")}>All time</button>
          {seasons.map((s) => <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={chipToggle(scope === s)}>{s}</button>)}
        </div>
        <Switch className="ml-auto" checked={minApps} onChange={setMinApps} label="Hide players with fewer than 5 appearances" />
      </div>
      <div className="scroll-x card overflow-x-auto">
        <table className="stats w-full md:min-w-[820px]">
          <thead>
            <tr>
              <th className="hidden w-8 static sm:table-cell">#</th>
              {COLS.map((c, ci) => (
                <th key={c.key} className={clsx(c.num && "num", c.hide, ci === 0 && "sticky-col")} aria-sort={sort.key === c.key ? (sort.dir === -1 ? "descending" : "ascending") : undefined}>
                  <button type="button" onClick={() => click(c.key)} title={c.title} className={clsx("focus-ring inline-flex min-w-8 items-center gap-1 rounded hover:text-ink", c.num && "justify-end", sort.key === c.key && "text-accent")}>{c.label}<span aria-hidden className="text-[9px]">{sort.key === c.key ? (sort.dir === -1 ? "▼" : "▲") : ""}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug}>
                <td className="hidden static text-muted sm:table-cell">{i + 1}</td>
                <td className="sticky-col"><Link href={`/squad/${r.slug}`} className="link block max-w-[8rem] truncate font-medium text-ink sm:max-w-none">{r.name}</Link></td>
                <td className="num">{r.apps}</td><td className="num font-semibold text-ink">{r.goals}</td><td className="num">{r.assists}</td><td className="num" title={`${r.goals} goal${r.goals === 1 ? "" : "s"} over ${r.gpgGames} match${r.gpgGames === 1 ? "" : "es"} with scorers recorded`}>{r.goalsPerGame.toFixed(2)}</td><td className="num hidden md:table-cell" title={`${r.assists} assist${r.assists === 1 ? "" : "s"} over ${r.apgGames} match${r.apgGames === 1 ? "" : "es"} with assists recorded`}>{r.assistsPerGame.toFixed(2)}</td>
                <td className="num hidden md:table-cell">{r.motm || ""}</td>
                <td className="num text-win">{r.wins}</td><td className="num hidden text-draw md:table-cell">{r.draws}</td><td className="num text-loss">{r.losses}</td>
                <td className="num hidden md:table-cell">{r.ppg.toFixed(2)}</td><td className="num font-semibold text-ink">{r.winRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty inset className="pt-4">No players in this scope yet.</Empty>}
      </div>
      <p className="mt-2 text-xs text-muted">Goals and assists a game are averaged over the matches where scorers (or assists) were recorded, so they can be higher than goals divided by appearances. Hover a value to see how many matches. Points a game counts three for a win and one for a draw.</p>
    </div>
  );
}
