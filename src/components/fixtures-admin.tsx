"use client";
import { useActionState, useState, useTransition } from "react";
import { CalendarPlus, Save, Trash2 } from "lucide-react";
import { deleteFixtureAction, saveFixtureAction, saveSeasonAction, type ActionState } from "@/app/actions/admin";
import { FormStatus, inputClass, Select } from "./controls";
import { btn } from "./button";

export type AdminSeason = { id: string; number: number; title: string; venue: string; venueUrl: string | null; period: string; pitchCost: number | null; paidBy: string | null; seasonCost: number; fixtures: number; isCurrent: boolean };
export type AdminFixture = { id: string; seasonId: string; gw: number; date: string | null; kickOff: string | null; opponent: string; type: string | null; matchCost: number; played: boolean };

const TYPES = [{ value: "", label: "League game" }, { value: "Friendly", label: "Friendly" }, { value: "Forfeit", label: "Forfeit" }, { value: "Cancelled", label: "Cancelled" }];
const field = "flex flex-col gap-1 text-xs text-muted";

function FixtureRow({ f, seasonId, nextGw }: { f?: AdminFixture; seasonId: string; nextGw: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveFixtureAction, null);
  const [gone, setGone] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const note = gone ?? state;
  return (
    // Fixed column widths, so every row lines up whatever it contains; the bin's slot is reserved even when there is no bin.
    <form action={action} className="grid grid-cols-2 gap-2 border-b border-ink/10 py-3 sm:grid-cols-[3.5rem_9.25rem_5.5rem_minmax(0,1fr)_9.5rem_6rem_8.25rem] sm:items-end">
      <input type="hidden" name="seasonId" value={seasonId} />
      {f && <input type="hidden" name="id" value={f.id} />}
      <label className={field}><span className="eyebrow">GW</span><input name="gw" defaultValue={f?.gw ?? nextGw} inputMode="numeric" className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Date</span><input name="date" type="date" defaultValue={f?.date ?? ""} className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Kick-off</span><input name="kickOff" defaultValue={f?.kickOff ?? ""} placeholder="20:15" className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Opponent</span><input name="opponent" defaultValue={f?.opponent ?? ""} placeholder="Who we are playing" className={inputClass} /></label>
      <Select label="Type" name="type" defaultValue={f?.type ?? ""} options={TYPES} />
      <label className={field}><span className="eyebrow">Pitch £</span><input name="matchCost" defaultValue={f ? f.matchCost.toFixed(2) : ""} inputMode="decimal" placeholder="default" className={`${inputClass} tabular`} /></label>
      <div className="col-span-2 flex h-[2.375rem] items-center gap-2 sm:col-span-1">
        <button type="submit" disabled={pending} className={btn("primary", "sm", "min-w-[5.25rem]")}>{f ? <Save size={14} aria-hidden /> : <CalendarPlus size={14} aria-hidden />}{pending ? "…" : f ? "Save" : "Add"}</button>
        {f && !f.played ? (
          <button type="button" disabled={busy} onClick={() => start(async () => setGone(await deleteFixtureAction(f.id)))} aria-label="Remove fixture" className={btn("secondary", "icon", "text-muted hover:text-loss")}><Trash2 size={14} aria-hidden /></button>
        ) : <span className="w-[2.375rem]" aria-hidden />}
      </div>
      {note && <FormStatus tone={note.ok ? "ok" : "error"} className="col-span-full">{note.message}</FormStatus>}
    </form>
  );
}

function SeasonForm({ s, roster }: { s?: AdminSeason; roster: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSeasonAction, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className={field}><span className="eyebrow">Id</span><input name="id" defaultValue={s?.id ?? ""} placeholder="S9" readOnly={Boolean(s)} className={`${inputClass} tabular`} /></label>
      <label className={`${field} sm:col-span-3`}><span className="eyebrow">Title</span><input name="title" defaultValue={s?.title ?? ""} placeholder="Season 9 · PlayFootball Old Street · Jan–Apr 2027" className={inputClass} /></label>
      <label className={`${field} sm:col-span-2`}><span className="eyebrow">Venue</span><input name="venue" defaultValue={s?.venue ?? ""} className={inputClass} /></label>
      <label className={`${field} sm:col-span-2`}><span className="eyebrow">Venue link</span><input name="venueUrl" type="url" defaultValue={s?.venueUrl ?? ""} placeholder="https://www.playfootball.net/venues/whitechapel" className={inputClass} /><span className="text-[11px] text-muted">Linked from the fixture page and the reminder email.</span></label>
      <label className={field}><span className="eyebrow">Period</span><input name="period" defaultValue={s?.period ?? ""} placeholder="Jan–Apr 2027" className={inputClass} /><span className="min-h-[1.25rem] text-[11px] text-muted" /></label>
      <label className={field}><span className="eyebrow">Pitch £ per game</span><input name="pitchCost" defaultValue={s?.pitchCost?.toFixed(2) ?? ""} inputMode="decimal" placeholder="79.95" className={`${inputClass} tabular`} /><span className="min-h-[1.25rem] text-[11px] text-muted">Used for new fixtures; each fixture can still be changed.</span></label>
      <div className={field}><Select label="Pitch paid by" name="paidBy" defaultValue={s?.paidBy ?? ""} options={[{ value: "", label: "Nobody yet" }, ...roster.map((r) => ({ value: r, label: r }))]} /><span className="min-h-[1.25rem] text-[11px] text-muted" /></div>
      <div className={field}><span className="eyebrow">Season cost</span><p className="flex h-[2.375rem] items-center text-sm text-ink tabular">{s ? `£${s.seasonCost.toFixed(2)}` : "–"} <span className="ml-2 text-xs text-muted">{s ? `${s.fixtures} game${s.fixtures === 1 ? "" : "s"} × pitch` : "price per game × games"}</span></p><span className="min-h-[1.25rem] text-[11px] text-muted" /></div>
      <div className="flex items-end gap-3 pb-[1.25rem] sm:col-span-2">
        <button type="submit" disabled={pending} className={btn("primary")}><Save size={16} aria-hidden />{pending ? "Saving…" : s ? "Save season" : "Create season"}</button>
        {state && <FormStatus tone={state.ok ? "ok" : "error"}>{state.message}</FormStatus>}
      </div>
    </form>
  );
}

/** Seasons and their fixtures. Pick a season, edit rows in place, add the next gameweek, or start a new season. */
export function FixturesAdmin({ seasons, fixtures, roster }: { seasons: AdminSeason[]; fixtures: AdminFixture[]; roster: string[] }) {
  const [seasonId, setSeasonId] = useState(seasons.find((s) => s.isCurrent)?.id ?? seasons.at(-1)?.id ?? "");
  const [creating, setCreating] = useState(false);
  const season = seasons.find((s) => s.id === seasonId);
  const rows = fixtures.filter((f) => f.seasonId === seasonId);
  const nextGw = (rows.at(-1)?.gw ?? 0) + 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Season" value={seasonId} onChange={setSeasonId} options={seasons.map((s) => ({ value: s.id, label: `${s.id}${s.isCurrent ? " · current" : ""}` }))} className="w-48" />
        <button type="button" onClick={() => setCreating((c) => !c)} className={btn("secondary")}>{creating ? "Cancel new season" : "New season"}</button>
      </div>
      {creating && <div className="rounded-xl bg-sunken/60 p-4"><p className="eyebrow mb-3">New season</p><SeasonForm roster={roster} /></div>}
      {season && <div className="rounded-xl bg-sunken/60 p-4"><p className="eyebrow mb-3">{season.id} details</p><SeasonForm s={season} roster={roster} /></div>}
      {season && (
        <div className="overflow-x-auto rounded-xl bg-sunken/60 p-4">
          <p className="eyebrow mb-1">{season.id} fixtures</p>
          <p className="mb-2 text-xs text-muted">Played games keep their result whatever you change here; the bin only shows for fixtures without a score.</p>
          <div className="min-w-[40rem]">
            {rows.map((f) => <FixtureRow key={f.id} f={f} seasonId={season.id} nextGw={nextGw} />)}
            <FixtureRow seasonId={season.id} nextGw={nextGw} />
          </div>
        </div>
      )}
    </div>
  );
}
