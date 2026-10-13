"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { MatchLite, Result } from "@/lib/types";
import { Empty, MatchRow } from "./ui";
import { chipToggle, inputClass, Switch } from "./controls";

export function MatchesBrowser({ matches, seasons, initialSeason, today }: { matches: MatchLite[]; seasons: { id: string; number: number; title: string }[]; initialSeason?: string; today: string }) {
  const [season, setSeason] = useState<string>(initialSeason ?? "all");
  const [result, setResult] = useState<Result | "all">("all");
  const [includeExcluded, setIncludeExcluded] = useState(true);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return matches.filter((m) => m.played)
      .filter((m) => season === "all" || m.seasonId === season)
      .filter((m) => result === "all" || m.result === result)
      .filter((m) => includeExcluded || m.countsForRecords)
      .filter((m) => !needle || m.opponent.toLowerCase().includes(needle) || (m.motm ?? "").toLowerCase().includes(needle) || (m.comment ?? "").toLowerCase().includes(needle) || m.lineup.some((l) => l.player.toLowerCase().includes(needle)))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.seasonNumber - a.seasonNumber || b.gw - a.gw);
  }, [matches, season, result, includeExcluded, q]);
  const counted = list.filter((m) => m.countsForRecords);
  const w = counted.filter((m) => m.result === "W").length, d = counted.filter((m) => m.result === "D").length, l = counted.filter((m) => m.result === "L").length;
  const gf = counted.reduce((s, m) => s + (m.ourGoals ?? 0), 0), ga = counted.reduce((s, m) => s + (m.theirGoals ?? 0), 0);
  const bySeason = new Map<string, MatchLite[]>();
  for (const m of list) bySeason.set(m.seasonId, [...(bySeason.get(m.seasonId) ?? []), m]);
  const groups = [...bySeason.entries()];
  const filtering = season !== "all" || result !== "all" || q.trim().length > 0;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3">
        <div className="scrollbar-none -mx-4 flex flex-nowrap gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap" role="group" aria-label="Season">
          <Chip active={season === "all"} onClick={() => setSeason("all")}>All seasons</Chip>
          {[...seasons].reverse().map((s) => <Chip key={s.id} active={season === s.id} onClick={() => setSeason(s.id)}>{s.id === "FR" ? "Friendlies" : `Season ${s.number}`}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5" role="group" aria-label="Result">
            {(["all", "W", "D", "L"] as const).map((r) => <Chip key={r} active={result === r} onClick={() => setResult(r)} tone={r}>{r === "all" ? "All results" : r === "W" ? "Wins" : r === "D" ? "Draws" : "Losses"}</Chip>)}
          </div>
          <Switch checked={includeExcluded} onChange={setIncludeExcluded} label="Include friendlies and forfeits" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opponents and players" aria-label="Search matches" className={clsx(inputClass, "py-1.5 sm:ml-auto sm:w-64")} />
        </div>
        <p className="text-xs text-muted">
          <span className="text-ink">{list.length}</span> match{list.length === 1 ? "" : "es"} · won {w}, drew {d}, lost {l} · scored {gf}, conceded {ga}
        </p>
      </div>
      {groups.map(([sid, ms], gi) => {
        const s = seasons.find((x) => x.id === sid);
        const cw = ms.filter((m) => m.countsForRecords && m.result === "W").length, cd = ms.filter((m) => m.countsForRecords && m.result === "D").length, cl = ms.filter((m) => m.countsForRecords && m.result === "L").length;
        const open = filtering || gi === 0;
        return (
          <details key={sid} open={open} className="group/season card mb-4 overflow-hidden">
            <summary className="focus-ring grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-5 py-4 hover:bg-ink/[0.02]">
              <div className="min-w-0">
                <h3 className="display text-2xl leading-none text-ink"><span className="whitespace-nowrap">{sid === "FR" ? "Friendlies" : s ? `Season ${s.number}` : sid}</span></h3>
                {s?.title.split("·")[1]?.trim() && <span className="mt-1 block text-xs text-muted">{s.title.split("·")[1].trim()}</span>}
              </div>
              <span className="tabular text-right text-xs text-muted">{ms.length} match{ms.length === 1 ? "" : "es"} · {cw}–{cd}–{cl}</span>
              <span className="text-muted transition-transform group-open/season:rotate-180" aria-hidden>▾</span>
            </summary>
            <div className="grid gap-0.5 border-t border-ink/8 p-2 lg:grid-cols-2">{ms.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div>
          </details>
        );
      })}
      {!list.length && <Empty>No matches found.</Empty>}
    </div>
  );
}

function Chip({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "all" | Result }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={clsx(chipToggle(active), active && tone && tone !== "all" && `result-${tone}`)}>{children}</button>
  );
}
