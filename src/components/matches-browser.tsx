"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { MatchLite, Result } from "@/lib/types";
import { MatchRow } from "./ui";
import { Switch } from "./controls";

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
      <div className="card mb-6 flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Season">
          <Chip active={season === "all"} onClick={() => setSeason("all")}>All seasons</Chip>
          {[...seasons].reverse().map((s) => <Chip key={s.id} active={season === s.id} onClick={() => setSeason(s.id)}>{s.id === "FR" ? "Friendlies" : s.id}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5" role="group" aria-label="Result">
            {(["all", "W", "D", "L"] as const).map((r) => <Chip key={r} active={result === r} onClick={() => setResult(r)} tone={r}>{r === "all" ? "Any result" : r === "W" ? "Wins" : r === "D" ? "Draws" : "Losses"}</Chip>)}
          </div>
          <Switch checked={includeExcluded} onChange={setIncludeExcluded} label="Friendlies & forfeits" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opponent, player, comment…" aria-label="Search matches" className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-ash/70 sm:ml-auto sm:w-64" />
        </div>
        <p className="text-xs text-ash">
          <span className="text-cream">{list.length}</span> match{list.length === 1 ? "" : "es"}{counted.length !== list.length && <> ({list.length - counted.length} not counted)</>} · <span className="text-mint-soft">W{w}</span> <span className="text-[#ffe27a]">D{d}</span> <span className="text-[#ff9a9d]">L{l}</span> · GF {gf} · GA {ga} · GD {gf - ga >= 0 ? "+" : ""}{gf - ga}
        </p>
      </div>
      {groups.map(([sid, ms], gi) => {
        const s = seasons.find((x) => x.id === sid);
        const cw = ms.filter((m) => m.countsForRecords && m.result === "W").length, cd = ms.filter((m) => m.countsForRecords && m.result === "D").length, cl = ms.filter((m) => m.countsForRecords && m.result === "L").length;
        const open = filtering || gi === 0;
        return (
          <details key={sid} open={open} className="group/season mb-4 rounded-2xl border border-white/5 open:border-white/10">
            <summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-3 hover:bg-white/[0.03]">
              <h2 className="display text-2xl text-cream"><span className="whitespace-nowrap">{sid === "FR" ? "Friendlies" : s ? `Season ${s.number}` : sid}</span></h2>
              <span className="text-xs text-ash">{s?.title.split("·")[1]?.trim()}</span>
              <span className="ml-auto text-xs text-ash">{ms.length} game{ms.length === 1 ? "" : "s"} · <span className="text-mint-soft">W{cw}</span> <span className="text-[#ffe27a]">D{cd}</span> <span className="text-[#ff9a9d]">L{cl}</span></span>
              <span className="text-ash transition-transform group-open/season:rotate-180" aria-hidden>▾</span>
            </summary>
            <div className="grid gap-1.5 px-3 pb-3 lg:grid-cols-2">{ms.map((m) => <MatchRow key={m.id} m={m} today={today} />)}</div>
          </details>
        );
      })}
      {!list.length && <p className="card px-4 py-8 text-center text-sm text-ash">No matches found. Which, given our record, is sometimes for the best.</p>}
    </div>
  );
}

function Chip({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "all" | Result }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={clsx("focus-ring chip cursor-pointer whitespace-nowrap transition-colors", active ? (tone === "W" ? "result-W" : tone === "D" ? "result-D" : tone === "L" ? "result-L" : "border-mint/50 bg-mint/15 text-mint-soft") : "text-ash hover:text-cream")}>{children}</button>
  );
}
