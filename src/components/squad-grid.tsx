"use client";
import { useMemo, useState, ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { fmtDate } from "@/lib/stats";
import { Shirt } from "./ui";

export type SquadCard = { name: string; slug: string; apps: number; goals: number; assists: number; motm: number; goalsPerGame: number; winRate: number; debut: string | null; seasonsPlayed: number; activeThisSeason: boolean; photo: string | null; shirt: number | null; positions: string[]; nickname: string | null };
type SortKey = "apps" | "goals" | "assists" | "goalsPerGame" | "winRate" | "motm" | "debut" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "apps", label: "Apps" }, { key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }, { key: "goalsPerGame", label: "Goals / game" },
  { key: "winRate", label: "Win %" }, { key: "motm", label: "MOTM" }, { key: "debut", label: "Debut" }, { key: "name", label: "A–Z" },
];
const FILTERS = ["all", "active", "GK", "DEF", "MID", "FWD"] as const;
type Filter = (typeof FILTERS)[number];

export function SquadGrid({ players, currentSeason }: { players: SquadCard[]; currentSeason: string | null }) {
  const [sort, setSort] = useState<SortKey>("apps");
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(() => {
    const filtered = players.filter((p) => filter === "all" ? true : filter === "active" ? p.activeThisSeason : p.positions.includes(filter));
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "debut") return (a.debut ?? "9999").localeCompare(b.debut ?? "9999");
      return (b[sort] as number) - (a[sort] as number) || b.apps - a.apps || a.name.localeCompare(b.name);
    });
  }, [players, sort, filter]);
  const filterLabel = (f: Filter) => f === "all" ? `All ${players.length}` : f === "active" ? `${currentSeason ?? "This season"} squad` : f;
  const chip = (active: boolean) => clsx("focus-ring chip chip-tap cursor-pointer whitespace-nowrap transition-colors", active ? "border-mint/50 bg-mint/15 text-mint-soft" : "text-ash hover:text-cream");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter players">
          {FILTERS.filter((f) => f !== "active" || currentSeason).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>{filterLabel(f)}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort players">
          <span className="eyebrow mr-1 shrink-0">Sort</span>
          {SORTS.map((s) => <button key={s.key} type="button" onClick={() => setSort(s.key)} aria-pressed={sort === s.key} className={chip(sort === s.key)}>{s.label}</button>)}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {list.map((p, i) => (
          <li key={p.slug} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
            <Link href={`/squad/${p.slug}`} className="focus-ring card group block h-full overflow-hidden transition-transform hover:-translate-y-0.5">
              <ViewTransition name={`player-${p.slug}`} share="morph" default="none">
                <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-forest to-pine">
                  {p.photo ? (
                    <Image src={p.photo} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized={p.photo.startsWith("http")} priority={i < 4} />
                  ) : (
                    <div className="pitch absolute inset-0 flex flex-col items-center justify-center">
                      <Shirt number={p.shirt} name={p.name} className="h-[68%] w-auto -translate-y-3 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.04]" />
                      <span className="chip absolute right-2 top-2 whitespace-nowrap border-gold/40 bg-night/80 text-[10px] text-gold backdrop-blur">Photo delayed</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/90 to-transparent" aria-hidden />
                  {p.shirt !== null && p.photo && <span className="display absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg leading-none text-night shadow"><span className="translate-y-[0.05em]">{p.shirt}</span></span>}
                  {p.activeThisSeason && <span className="chip absolute left-2 top-2 border-mint/50 bg-night/85 text-mint-soft shadow backdrop-blur">{currentSeason}</span>}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h2 className="display text-2xl leading-none text-cream drop-shadow">{p.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ash">
                      {p.nickname && <span className="italic">“{p.nickname}”</span>}
                      {p.positions.map((pos) => <span key={pos} className="rounded bg-white/10 px-1.5 py-0.5 font-semibold tracking-wider text-cream/80">{pos}</span>)}
                    </p>
                  </div>
                </div>
              </ViewTransition>
              <dl className="grid grid-cols-4 divide-x divide-white/10 text-center">
                {[["Apps", p.apps], ["Goals", p.goals], ["Assists", p.assists], ["G/G", p.goalsPerGame.toFixed(2)]].map(([k, v]) => (
                  <div key={k} className="px-1 py-2.5"><dt className="text-[10px] uppercase tracking-wider text-ash">{k}</dt><dd className="display tabular text-xl text-cream">{v}</dd></div>
                ))}
              </dl>
              <p className="border-t border-white/10 px-3 py-2 text-[11px] text-ash">Debut {fmtDate(p.debut)} · {p.seasonsPlayed} season{p.seasonsPlayed === 1 ? "" : "s"} · {p.winRate}% win rate</p>
            </Link>
          </li>
        ))}
      </ul>
      {!list.length && <p className="card px-4 py-8 text-center text-sm text-ash">Nobody matches that filter. Much like our defence.</p>}
    </div>
  );
}
