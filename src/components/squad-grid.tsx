"use client";
import { useMemo, useState, ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { fmtDate } from "@/lib/stats";
import { Shirt } from "./ui";

export type SquadCard = { name: string; slug: string; apps: number; goals: number; assists: number; motm: number; goalsPerGame: number; winRate: number; debut: string | null; seasonsPlayed: number; activeThisSeason: boolean; photo: string | null; shirt: number | null; positions: string[]; nickname: string | null; ringer: boolean };
type SortKey = "apps" | "goals" | "assists" | "goalsPerGame" | "winRate" | "motm" | "debut" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "apps", label: "Appearances" }, { key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }, { key: "goalsPerGame", label: "Goals a game" },
  { key: "winRate", label: "Win rate" }, { key: "motm", label: "Man of the match" }, { key: "debut", label: "Debut" }, { key: "name", label: "Name" },
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
  const POS: Record<string, string> = { GK: "Goalkeepers", DEF: "Defenders", MID: "Midfielders", FWD: "Forwards" };
  const filterLabel = (f: Filter) => f === "all" ? `Everyone (${players.length})` : f === "active" ? "This season" : POS[f];
  const chip = (active: boolean) => clsx("focus-ring chip chip-tap cursor-pointer whitespace-nowrap transition-colors", active ? "border-ink bg-ink text-paper" : "bg-surface text-muted hover:text-ink");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter players">
          {FILTERS.filter((f) => f !== "active" || currentSeason).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>{filterLabel(f)}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort players">
          <span className="eyebrow mr-1 shrink-0">Sort by</span>
          {SORTS.map((s) => <button key={s.key} type="button" onClick={() => setSort(s.key)} aria-pressed={sort === s.key} className={chip(sort === s.key)}>{s.label}</button>)}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {list.map((p, i) => (
          <li key={p.slug} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
            <Link href={`/squad/${p.slug}`} className="focus-ring card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
              <ViewTransition name={`player-${p.slug}`} share="morph" default="none">
                <div className="relative aspect-[4/5] overflow-hidden bg-sunken">
                  {p.photo ? (
                    <Image src={p.photo} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized={p.photo.startsWith("http")} priority={i < 4} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shirt number={p.shirt} name={p.name} className="h-[62%] w-auto transition-transform duration-500 group-hover:scale-[1.03]" />
                    </div>
                  )}
                  {p.shirt !== null && p.photo && <span className="display absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-xl leading-none text-ink shadow-sm backdrop-blur">{p.shirt}</span>}
                  {p.ringer && <span className="chip absolute left-2.5 top-2.5 bg-surface/90 text-muted backdrop-blur">Ringer</span>}
                </div>
              </ViewTransition>
              <div className="px-4 pb-3 pt-3.5">
                <h2 className="display truncate text-[1.6rem] leading-tight text-ink group-hover:text-accent">{p.name}</h2>
                <p className="mt-0.5 flex min-h-[1.25rem] flex-wrap items-center gap-x-2 text-xs text-muted">
                  {p.positions.length > 0 && <span className="font-medium tracking-wide">{p.positions.join(" · ")}</span>}
                  {p.nickname && <span className="italic">“{p.nickname}”</span>}
                  {p.activeThisSeason && <span className="inline-flex items-center gap-1 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />{currentSeason ? `Season ${currentSeason.replace(/^S/, "")}` : "This season"}</span>}
                </p>
              </div>
              <dl className="mt-auto grid grid-cols-3 border-t border-ink/8 text-center">
                {[["Apps", p.apps], ["Goals", p.goals], ["Assists", p.assists]].map(([k, v]) => (
                  <div key={k} className="flex flex-col-reverse px-1 py-2.5"><dt className="eyebrow eyebrow-sm">{k}</dt><dd className="display text-2xl leading-tight text-ink">{v}</dd></div>
                ))}
              </dl>
              <p className="hidden border-t border-ink/8 px-4 py-2 text-[11px] text-muted sm:block">Debut {fmtDate(p.debut, { month: "short", year: "numeric" })} · {p.seasonsPlayed} season{p.seasonsPlayed === 1 ? "" : "s"}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!list.length && <p className="card px-4 py-8 text-center text-sm text-muted">No players match that filter.</p>}
    </div>
  );
}
