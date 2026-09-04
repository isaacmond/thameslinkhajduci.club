"use client";
import { useActionState, useState, useTransition } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { addMemberAction, removeMemberAction, setAdminAction, type ActionState } from "@/app/actions/admin";
import { inputClass, Select } from "./controls";

export type MemberRow = { email: string; player: string; admin: boolean };

/** Who can sign in. Any address can be removed except your own and the last admin's. */
export function MembersAdmin({ members, roster, me }: { members: MemberRow[]; roster: string[]; me: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMemberAction, null);
  const [player, setPlayer] = useState(roster[0] ?? "");
  const [removed, setRemoved] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const remove = (email: string) => start(async () => setRemoved(await removeMemberAction(email)));
  const toggleAdmin = (player: string, makeAdmin: boolean) => start(async () => setRemoved(await setAdminAction(player, makeAdmin)));
  const byPlayer = new Map<string, MemberRow[]>();
  for (const m of members) byPlayer.set(m.player, [...(byPlayer.get(m.player) ?? []), m]);
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-white/10 text-sm">
        {[...byPlayer.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([p, rows]) => (
          <li key={p} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="inline-flex w-40 shrink-0 items-center font-medium text-cream">{p}{rows.some((r) => r.admin) && <ShieldCheck size={14} className="ml-1 inline align-text-bottom text-gold" aria-label="admin" />}</span>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
              {rows.map((r) => (
                <li key={r.email} className="chip gap-2">
                  <span className="font-normal normal-case tracking-normal text-cream/90">{r.email}</span>
                  {r.email.toLowerCase() === me.toLowerCase() ? <span className="text-ash" title="That is you">·</span> : <button type="button" onClick={() => remove(r.email)} disabled={busy} aria-label={`Remove ${r.email}`} className="focus-ring text-ash hover:text-loss-soft"><Trash2 size={12} aria-hidden /></button>}
                </li>
              ))}
            </ul>
            <button type="button" disabled={busy} onClick={() => toggleAdmin(p, !rows.some((r) => r.admin))} className="focus-ring shrink-0 rounded-md px-2 py-1 text-xs text-ash hover:text-cream">{rows.some((r) => r.admin) ? "Remove admin" : "Make admin"}</button>
          </li>
        ))}
      </ul>
      {removed && <p role="status" className={`text-sm ${removed.ok ? "text-mint-soft" : "text-loss-soft"}`}>{removed.message}</p>}
      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Email</span><input name="email" type="email" required placeholder="name@example.com" className={inputClass} /></label>
        <Select label="Signs in as" value={player} onChange={setPlayer} options={roster.map((r) => ({ value: r, label: r }))} />
        <input type="hidden" name="player" value={player} />
        <label className="flex h-[2.375rem] items-center gap-2 text-xs text-ash"><input type="checkbox" name="admin" className="accent-mint" />Admin</label>
        <button type="submit" disabled={pending} className="focus-ring inline-flex h-[2.375rem] items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50"><UserPlus size={16} aria-hidden />{pending ? "Adding…" : "Add"}</button>
      </form>
      {state && <p role="status" className={`text-sm ${state.ok ? "text-mint-soft" : "text-loss-soft"}`}>{state.message}</p>}
    </div>
  );
}
