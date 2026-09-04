"use client";
import type { ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C } from "./charts";

/**
 * Golden-boot race hues in fixed order, leader first. Adjacent pairs clear the CVD separation check against the dark surface
 * (validate_palette --mode dark); gold and sage sit outside the strict lightness/chroma band, so identity never rests on hue alone:
 * the leader is the only thick line and the only end label, every line gets an end dot with a surface ring, and the legend + tooltip name the rest.
 */
const RACE_HUES = [C.green, C.blue, C.gold, C.amber, C.sage];

type TipPayload = { name?: string | number; value?: unknown; color?: string; fill?: string; dataKey?: string | number; payload?: Record<string, unknown> };
type TipProps = { active?: boolean; payload?: ReadonlyArray<TipPayload>; label?: unknown };

function TipBox({ title, rows }: { title: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string; strong?: boolean }[] }) {
  return (
    <div style={{ background: C.surface, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: C.cream, boxShadow: "0 10px 30px -12px rgba(0,0,0,.6)", minWidth: 150 }}>
      <div style={{ color: C.ink, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {r.color && <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color, display: "inline-block", flexShrink: 0 }} />}
          <span style={{ color: r.strong ? C.cream : C.ink, fontWeight: r.strong ? 600 : 400 }}>{r.label}</span>
          <span style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
const axis = { tick: { fill: C.ink, fontSize: 11 }, axisLine: false, tickLine: false } as const;
const legend = { iconType: "circle" as const, iconSize: 8, wrapperStyle: { fontSize: 11, color: C.ink, letterSpacing: "0.08em", textTransform: "uppercase" as const } };
/** Legend with our own entries (Recharts 3 no longer takes a `payload` prop), so the race can list the leader first and the points chart can key just two things. */
function Key({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", listStyle: "none", margin: 0, padding: "6px 0 0" }}>
      {items.map((it) => (
        <li key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: it.color, display: "inline-block", flexShrink: 0 }} />{it.label}
        </li>
      ))}
    </ul>
  );
}
const crosshair = { stroke: "rgba(255,255,255,0.2)" };
/** End-of-line label in text ink with a surface halo, so it stays legible where it crosses gridlines, other series or the axis. */
const endLabel = (value: string, position: "right" | "top" = "right") => ({ value, position, fill: C.cream, fontSize: 11, fontWeight: 600, stroke: C.surface, strokeWidth: 3, paintOrder: "stroke" as const, strokeLinejoin: "round" as const });
const numeric = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/* ------------------------------------------------------------------ */
/* Golden boot race: cumulative goals per gameweek for a season's top scorers. */

function RaceTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((p) => numeric(p.value))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .map((p, i) => ({ label: String(p.name ?? ""), value: String(p.value), color: p.color ?? p.fill, strong: i === 0 }));
  return <TipBox title={String(label ?? "")} rows={rows} />;
}

/** `rows` from goalRace(): one row per gameweek with a `label` plus a numeric field per player. `players` is leader first. */
export function GoalRaceChart({ rows, players }: { rows: Record<string, number | string>[]; players: string[] }) {
  const last = rows[rows.length - 1];
  const hue = (i: number) => RACE_HUES[Math.min(i, RACE_HUES.length - 1)];
  const first = (n: string) => n.split(" ")[0];
  // Draw the leader last so it sits on top; the legend keeps leader-first order via its own payload.
  const drawOrder = players.map((p, i) => ({ p, i })).reverse();
  const key = players.map((p, i) => ({ label: p, color: hue(i) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 12, right: 72, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<RaceTip />} cursor={crosshair} />
        <Legend {...legend} content={<Key items={key} />} />
        {drawOrder.map(({ p, i }) => (
          <Line key={p} type="monotone" dataKey={p} name={p} stroke={hue(i)} strokeWidth={i === 0 ? 2.5 : 1.5} strokeOpacity={i === 0 ? 1 : 0.85} dot={false} activeDot={{ r: 5, fill: hue(i), stroke: C.surface, strokeWidth: 2 }} isAnimationActive={false} />
        ))}
        {last && drawOrder.map(({ p, i }) => {
          const v = last[p];
          if (!numeric(v)) return null;
          return <ReferenceDot key={`end-${p}`} x={String(last.label)} y={v} r={i === 0 ? 5 : 4} fill={hue(i)} stroke={C.surface} strokeWidth={2} label={i === 0 ? endLabel(`${first(p)} ${v}`) : undefined} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Points race: every season's cumulative points by game number, the chosen season picked out. */

type SeasonSeries = { seasonId: string; number: number; pts: number[] };

function PointsTip({ active, payload, label, current }: TipProps & { current: string | null }) {
  if (!active || !payload?.length) return null;
  const g = Number(label);
  const rows = payload
    .filter((p) => numeric(p.value))
    .sort((a, b) => (b.value as number) - (a.value as number) || String(b.dataKey).localeCompare(String(a.dataKey)))
    .map((p) => ({ label: String(p.name ?? ""), value: `${p.value} pts`, color: p.dataKey === current ? C.green : C.sage, strong: p.dataKey === current }));
  return <TipBox title={g === 0 ? "Kick-off" : `After ${g} game${g === 1 ? "" : "s"}`} rows={rows} />;
}

/** `series` from pointsProgression(); `current` is the season id to pick out in green (the rest fade into sage). */
export function PointsRaceChart({ series, current }: { series: SeasonSeries[]; current: string | null }) {
  const maxGames = Math.max(0, ...series.map((s) => s.pts.length));
  const rows = Array.from({ length: maxGames + 1 }, (_, g) => {
    const r: Record<string, number> = { game: g };
    for (const s of series) if (g === 0) r[s.seasonId] = 0; else if (g <= s.pts.length) r[s.seasonId] = s.pts[g - 1];
    return r;
  });
  const cur = series.find((s) => s.seasonId === current) ?? null;
  const drawOrder = [...series.filter((s) => s !== cur), ...(cur ? [cur] : [])];
  const key = [
    ...(cur ? [{ label: `Season ${cur.number}`, color: C.green }] : []),
    ...(series.length > (cur ? 1 : 0) ? [{ label: cur ? "Earlier seasons" : "Each season", color: C.sage }] : []),
  ];
  const finalPts = cur?.pts[cur.pts.length - 1];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 12, right: 72, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="game" type="number" domain={[0, maxGames]} tickCount={Math.min(maxGames + 1, 8)} {...axis} allowDecimals={false} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<PointsTip current={current} />} cursor={crosshair} />
        <Legend {...legend} content={<Key items={key} />} />
        {drawOrder.map((s) => {
          const isCur = s === cur;
          return <Line key={s.seasonId} type="monotone" dataKey={s.seasonId} name={`Season ${s.number}`} stroke={isCur ? C.green : C.sage} strokeOpacity={isCur ? 1 : 0.35} strokeWidth={isCur ? 2.5 : 1.25} dot={false} activeDot={{ r: isCur ? 5 : 3, fill: isCur ? C.green : C.sage, stroke: C.surface, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />;
        })}
        {cur && numeric(finalPts) && <ReferenceDot x={cur.pts.length} y={finalPts} r={5} fill={C.green} stroke={C.surface} strokeWidth={2} label={endLabel(`S${cur.number} · ${finalPts} pt${finalPts === 1 ? "" : "s"}`, finalPts === 0 ? "top" : "right")} />}
      </LineChart>
    </ResponsiveContainer>
  );
}
