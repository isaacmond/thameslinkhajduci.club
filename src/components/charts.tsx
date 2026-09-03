"use client";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Categorical palette validated against the dark green surface (dataviz six checks, dark mode). */
/** Series colours validated against the dark surface (dataviz checks): club green + a calm blue pass every check as a pair. Volume (apps) is drawn as an outlined bar (texture, not a competing hue); conceded is blue and dashed; W/D/L stacks keep the site-wide semantic colours with 2px gaps and a legend. */
export const C = { green: "#22a852", blue: "#4a8fe0", sage: "#9fb8a6", gold: "#f4c81b", amber: "#c4871a", win: "#22a852", draw: "#c4871a", loss: "#d9484e", grid: "rgba(255,255,255,0.08)", ink: "#a7b8ab", surface: "#0d2b19", cream: "#f6f1e6" };
/** Seasons are ordinal, so they take a one-hue ramp (oldest dark → newest light). Segments always get a 2px surface gap, a legend and a hover tooltip. */
export const SEASON_RAMP = ["#2e7d46", "#3a9256", "#47a765", "#58bb76", "#6ccd88", "#83dc9a", "#9ce9ad", "#b6f2c2", "#cdf8d6", "#e2fce8"];
export const seasonColor = (i: number) => SEASON_RAMP[Math.min(i, SEASON_RAMP.length - 1)];

type TipPayload = { name?: string | number; value?: unknown; color?: string; fill?: string; dataKey?: string | number; payload?: Record<string, unknown> };
type TipProps = { active?: boolean; payload?: ReadonlyArray<TipPayload>; label?: unknown };

function TipBox({ title, rows }: { title: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string }[] }) {
  return (
    <div style={{ background: C.surface, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: C.cream, boxShadow: "0 10px 30px -12px rgba(0,0,0,.6)", minWidth: 140 }}>
      <div style={{ color: C.ink, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {r.color && <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color, display: "inline-block", flexShrink: 0 }} />}
          <span style={{ color: C.ink }}>{r.label}</span>
          <span style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
function DefaultTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== 0).map((p) => ({ label: String(p.name ?? ""), value: String(p.value ?? ""), color: p.color ?? p.fill }));
  return <TipBox title={String(label ?? "")} rows={rows.length ? rows : [{ label: "—", value: "0" }]} />;
}
const axis = { tick: { fill: C.ink, fontSize: 11 }, axisLine: false, tickLine: false } as const;
const legend = { iconType: "circle" as const, iconSize: 8, wrapperStyle: { fontSize: 11, color: C.ink, letterSpacing: "0.08em", textTransform: "uppercase" as const } };
const cursor = { fill: "rgba(255,255,255,0.05)" };
const shortSeason = (v: string) => String(v).replace("Season ", "S");

export function WDLBySeason({ data }: { data: { name: string; won: number; drawn: number; lost: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%" maxBarSize={64}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="name" {...axis} tickFormatter={shortSeason} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<DefaultTip />} cursor={cursor} />
        <Legend {...legend} />
        <Bar dataKey="won" name="Won" stackId="a" fill={C.win} stroke={C.surface} strokeWidth={2} />
        <Bar dataKey="drawn" name="Drawn" stackId="a" fill={C.draw} stroke={C.surface} strokeWidth={2} />
        <Bar dataKey="lost" name="Lost" stackId="a" fill={C.loss} stroke={C.surface} strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GoalsBySeason({ data }: { data: { name: string; avgFor: number; avgAgainst: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="name" {...axis} tickFormatter={shortSeason} />
        <YAxis {...axis} />
        <Tooltip content={<DefaultTip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
        <Legend {...legend} />
        <Line type="monotone" dataKey="avgFor" name="Scored per game" stroke={C.green} strokeWidth={2} dot={{ r: 4, fill: C.green, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="avgAgainst" name="Conceded per game" stroke={C.blue} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: C.blue, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlayerSeasonBars({ data }: { data: { name: string; apps: number; goals: number; assists: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<DefaultTip />} cursor={cursor} />
        <Legend {...legend} />
        <Bar dataKey="apps" name="Apps" fill="rgba(255,255,255,0.06)" stroke={C.sage} strokeWidth={1.5} radius={[4, 4, 0, 0]} />
        <Bar dataKey="goals" name="Goals" fill={C.green} radius={[4, 4, 0, 0]} />
        <Bar dataKey="assists" name="Assists" fill={C.blue} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalLeaders({ data, color = C.green, label }: { data: { name: string; value: number }[]; color?: string; label: string }) {
  const h = Math.max(120, data.length * 30 + 20);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap="25%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={120} {...axis} />
        <Tooltip content={<DefaultTip />} cursor={cursor} />
        <Bar dataKey="value" name={label} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="value" position="right" fill={C.cream} fontSize={12} />
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={i === 0 ? 1 : 0.75} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function GDTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { label: string; gd: number; opponent: string; score: string } | undefined;
  if (!d) return null;
  return <TipBox title={`${d.label} · ${d.opponent}`} rows={[{ label: "Score", value: d.score }, { label: "Goal difference", value: `${d.gd > 0 ? "+" : ""}${d.gd}` }]} />;
}
export function GoalDiffTimeline({ data }: { data: { label: string; gd: number; opponent: string; score: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%" maxBarSize={56}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<GDTip />} cursor={cursor} />
        <Bar dataKey="gd" name="Goal difference" radius={[3, 3, 3, 3]}>
          {data.map((d, i) => <Cell key={i} fill={d.gd > 0 ? C.win : d.gd < 0 ? C.loss : C.draw} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal stacked bars: one row per player, one segment per season. Rows carry `name` (with total baked in) plus a numeric field per season id. */
export function StackedBySeason({ data, seasons }: { data: Record<string, number | string>[]; seasons: string[] }) {
  const h = Math.max(160, data.length * 28 + 48);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid horizontal={false} stroke={C.grid} />
        <XAxis type="number" {...axis} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={168} {...axis} tick={{ fill: C.ink, fontSize: 10 }} />
        <Tooltip content={<DefaultTip />} cursor={cursor} />
        <Legend {...legend} />
        {seasons.map((s, i) => <Bar key={s} dataKey={s} name={s} stackId="a" fill={seasonColor(i)} stroke={C.surface} strokeWidth={2} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
