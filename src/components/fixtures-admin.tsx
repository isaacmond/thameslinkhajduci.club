"use client";
import { useActionState, useState, useTransition } from "react";
import { CalendarPlus, Save, Trash2 } from "lucide-react";
import { deleteFixtureAction, saveFixtureAction, saveSeasonAction, type ActionState } from "@/app/actions/admin";
import { inputClass, Select } from "./controls";

export type AdminSeason = { id: string; number: number; title: string; venue: string; period: string; pitchCost: number | null; paidBy: string | null; seasonCost: number; isCurrent: boolean };
export type AdminFixture = { id: string; seasonId: string; gw: number; date: string | null; kickOff: string | null; opponent: string; type: string | null; matchCost: number; played: boolean };

const TYPES = [{ value: "", label: "League game" }, { value: "Friendly", label: "Friendly" }, { value: "Forfeit", label: "Forfeit" }, { value: "Cancelled", label: "Cancelled" }];
const field = "flex flex-col gap-1 text-xs text-ash";

function FixtureRow({ f, seasonId, nextGw }: { f?: AdminFixture; seasonId: string; nextGw: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveFixtureAction, null);
  const [gone, setGone] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  return (
    <form action={action} className="grid grid-cols-2 gap-2 border-b border-white/10 py-3 sm:grid-cols-[3.5rem_8rem_5.5rem_1fr_8rem_6rem_auto] sm:items-end">
      <input type="hidden" name="seasonId" value={seasonId} />
      {f && <input type="hidden" name="id" value={f.id} />}
      <label className={field}><span className="eyebrow">GW</span><input name="gw" defaultValue={f?.gw ?? nextGw} inputMode="numeric" className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Date</span><input name="date" type="date" defaultValue={f?.date ?? ""} className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Kick-off</span><input name="kickOff" defaultValue={f?.kickOff ?? ""} placeholder="20:15" className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Opponent</span><input name="opponent" defaultValue={f?.opponent ?? ""} placeholder="Who we are playing" className={inputClass} /></label>
      <label className={field}><span className="eyebrow">Type</span><select name="type" defaultValue={f?.type ?? ""} className="control focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream">{TYPES.map((t) => <option key={t.value} value={t.value} className="bg-pine">{t.label}</option>)}</select></label>
      <label className={field}><span className="eyebrow">Pitch £</span><input name="matchCost" defaultValue={f ? f.matchCost.toFixed(2) : ""} inputMode="decimal" placeholder="season default" className={`${inputClass} tabular`} /></label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <button type="submit" disabled={pending} className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50">{f ? <Save size={14} aria-hidden /> : <CalendarPlus size={14} aria-hidden />}{pending ? "Saving…" : f ? "Save" : "Add"}</button>
        {f && !f.played && <button type="button" disabled={busy} onClick={() => start(async () => setGone(await deleteFixtureAction(f.id)))} aria-label="Remove fixture" className="focus-ring rounded-lg border border-white/15 p-2 text-ash hover:text-[#ff9a9d]"><Trash2 size={14} aria-hidden /></button>}
        {(state || gone) && <span role="status" className={`text-xs ${(gone ?? state)!.ok ? "text-mint-soft" : "text-[#ff9a9d]"}`}>{(gone ?? state)!.message}</span>}
      </div>
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
      <label className={field}><span className="eyebrow">Period</span><input name="period" defaultValue={s?.period ?? ""} placeholder="Jan–Apr 2027" className={inputClass} /></label>
      <label className={field}><span className="eyebrow">Pitch £ per game</span><input name="pitchCost" defaultValue={s?.pitchCost?.toFixed(2) ?? ""} inputMode="decimal" className={`${inputClass} tabular`} /></label>
      <label className={field}><span className="eyebrow">Pitch paid by</span><select name="paidBy" defaultValue={s?.paidBy ?? ""} className="control focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream"><option value="" className="bg-pine">Nobody yet</option>{roster.map((r) => <option key={r} value={r} className="bg-pine">{r}</option>)}</select></label>
      <label className={field}><span className="eyebrow">Season cost £</span><input name="seasonCost" defaultValue={s ? s.seasonCost.toFixed(2) : ""} inputMode="decimal" className={`${inputClass} tabular`} /></label>
      <div className="col-span-2 flex items-end gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50"><Save size={16} aria-hidden />{pending ? "Saving…" : s ? "Save season" : "Create season"}</button>
        {state && <span role="status" className={`text-xs ${state.ok ? "text-mint-soft" : "text-[#ff9a9d]"}`}>{state.message}</span>}
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
        <button type="button" onClick={() => setCreating((c) => !c)} className="focus-ring rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-cream hover:bg-white/10">{creating ? "Cancel new season" : "New season"}</button>
      </div>
      {creating && <div className="card p-4"><p className="eyebrow mb-3">New season</p><SeasonForm roster={roster} /></div>}
      {season && <div className="card p-4"><p className="eyebrow mb-3">{season.id} details</p><SeasonForm s={season} roster={roster} /></div>}
      {season && (
        <div className="card overflow-x-auto p-4">
          <p className="eyebrow mb-1">{season.id} fixtures</p>
          <p className="mb-2 text-xs text-ash">Played games keep their result whatever you change here; the bin only shows for fixtures without a score.</p>
          <div className="min-w-[40rem]">
            {rows.map((f) => <FixtureRow key={f.id} f={f} seasonId={season.id} nextGw={nextGw} />)}
            <FixtureRow seasonId={season.id} nextGw={nextGw} />
          </div>
        </div>
      )}
    </div>
  );
}
