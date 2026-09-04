"use client";
import { useActionState, useState, useTransition } from "react";
import { ClipboardList, Eye, MailWarning, Send } from "lucide-react";
import { previewReminderAction, saveSquadAction, sendRemindersAction, type ActionState } from "@/app/actions/admin";
import { inputClass, Select } from "./controls";

export type SquadFixture = { id: string; label: string; date: string | null };
export type SquadPlayer = { name: string; shirt: number | null; hasEmail: boolean };
export type SavedSquad = { players: string[]; note: string | null; remindedAt: string | null };

/** The expected squad for an upcoming fixture. Saved here, emailed to everyone on it the day before (or now, with the button). */
export function SquadAdmin({ fixtures, roster, squads }: { fixtures: SquadFixture[]; roster: SquadPlayer[]; squads: Record<string, SavedSquad> }) {
  const [matchId, setMatchId] = useState(fixtures[0]?.id ?? "");
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSquadAction, null);
  const [sent, setSent] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const saved = squads[matchId];
  const [picked, setPicked] = useState<Set<string>>(new Set(saved?.players ?? []));
  const [note, setNote] = useState(saved?.note ?? "");
  const choose = (id: string) => { setMatchId(id); setPicked(new Set(squads[id]?.players ?? [])); setNote(squads[id]?.note ?? ""); setSent(null); };
  const toggle = (name: string) => setPicked((s) => { const n = new Set(s); if (n.has(name)) n.delete(name); else n.add(name); return n; });
  if (!fixtures.length) return <p className="text-sm text-ash">No upcoming fixtures. Add one under Seasons &amp; fixtures first.</p>;
  const missing = [...picked].filter((p) => !roster.find((r) => r.name === p)?.hasEmail);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Select label="Fixture" value={matchId} onChange={choose} options={fixtures.map((f) => ({ value: f.id, label: f.label }))} className="min-w-0" />
        <p className="flex h-[2.375rem] items-center text-xs text-ash">{saved?.remindedAt ? `Reminder sent ${new Date(saved.remindedAt).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : saved?.players.length ? "Saved, reminder not sent yet" : "No team sheet yet"}</p>
      </div>
      <fieldset>
        <legend className="eyebrow mb-2">Squad · {picked.size} picked</legend>
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {roster.map((p) => (
            <li key={p.name}>
              <label className={`focus-within:ring-2 focus-within:ring-mint/60 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${picked.has(p.name) ? "border-mint/60 bg-mint/15 text-mint-soft" : "border-white/10 bg-white/5 text-cream hover:bg-white/10"}`}>
                <input type="checkbox" name="players" value={p.name} checked={picked.has(p.name)} onChange={() => toggle(p.name)} className="sr-only" />
                <span className="tabular w-6 shrink-0 text-xs text-ash">{p.shirt ?? ""}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {!p.hasEmail && <MailWarning size={13} className="shrink-0 text-gold" aria-label="No email on the members list" />}
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-ash"><MailWarning size={11} className="mr-1 inline text-gold" aria-hidden />means no email address on the members list, so they will not get the reminder. Add them under Members.</p>
      </fieldset>
      <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Note for the squad (optional)</span><textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} rows={2} placeholder="Anything beyond the usual: a different pitch, a later meet, who has the ball." className={`${inputClass} min-h-[3.5rem] resize-y`} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="focus-ring inline-flex h-[2.375rem] items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50"><ClipboardList size={16} aria-hidden />{pending ? "Saving…" : "Save team sheet"}</button>
        <button type="button" disabled={busy || !saved?.players.length} onClick={() => start(async () => setSent(await sendRemindersAction(matchId)))} title={saved?.players.length ? "Email everyone on the saved team sheet now" : "Save the team sheet first"} className="focus-ring inline-flex h-[2.375rem] items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-cream hover:bg-white/10 disabled:opacity-50"><Send size={16} aria-hidden />{busy ? "Sending…" : "Send reminder now"}</button>
        <button type="button" disabled={busy} onClick={() => start(async () => setSent(await previewReminderAction(matchId)))} title="Email a copy to yourself only, nothing saved" className="focus-ring inline-flex h-[2.375rem] items-center gap-2 rounded-lg px-3 text-sm text-ash hover:text-cream disabled:opacity-50"><Eye size={16} aria-hidden />Email me a preview</button>
        {missing.length > 0 && <span className="text-xs text-gold">{missing.length} picked without an email</span>}
      </div>
      {(sent ?? state) && <p role="status" className={`text-sm ${(sent ?? state)!.ok ? "text-mint-soft" : "text-[#ff9a9d]"}`}>{(sent ?? state)!.message}</p>}
    </form>
  );
}
