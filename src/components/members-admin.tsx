"use client";
import { useActionState, useState, useTransition } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { addMemberAction, removeMemberAction, type ActionState } from "@/app/actions/admin";
import { inputClass, Select } from "./controls";

export type MemberRow = { email: string; player: string; admin: boolean; fixed: boolean };

/** Who can sign in. Addresses fixed in code cannot be removed here; the rest can. */
export function MembersAdmin({ members, roster, me }: { members: MemberRow[]; roster: string[]; me: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMemberAction, null);
  const [player, setPlayer] = useState(roster[0] ?? "");
  const [removed, setRemoved] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const remove = (email: string) => start(async () => setRemoved(await removeMemberAction(email)));
  const byPlayer = new Map<string, MemberRow[]>();
  for (const m of members) byPlayer.set(m.player, [...(byPlayer.get(m.player) ?? []), m]);
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-white/10 text-sm">
        {[...byPlayer.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([p, rows]) => (
          <li key={p} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="w-40 shrink-0 font-medium text-cream">{p}{rows.some((r) => r.admin) && <ShieldCheck size={14} className="ml-1 inline text-gold" aria-label="admin" />}</span>
            <ul className="flex flex-wrap gap-2">
              {rows.map((r) => (
                <li key={r.email} className="chip gap-2">
                  <span className="font-normal normal-case tracking-normal text-cream/90">{r.email}</span>
                  {r.fixed || r.email.toLowerCase() === me.toLowerCase() ? <span className="text-ash" title={r.fixed ? "Set in the site's code" : "That is you"}>·</span> : <button type="button" onClick={() => remove(r.email)} disabled={busy} aria-label={`Remove ${r.email}`} className="focus-ring text-ash hover:text-[#ff9a9d]"><Trash2 size={12} aria-hidden /></button>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {removed && <p role="status" className={`text-sm ${removed.ok ? "text-mint-soft" : "text-[#ff9a9d]"}`}>{removed.message}</p>}
      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Email</span><input name="email" type="email" required placeholder="name@example.com" className={inputClass} /></label>
        <Select label="Signs in as" value={player} onChange={setPlayer} options={roster.map((r) => ({ value: r, label: r }))} />
        <input type="hidden" name="player" value={player} />
        <label className="flex h-[2.375rem] items-center gap-2 text-xs text-ash"><input type="checkbox" name="admin" className="accent-mint" />Admin</label>
        <button type="submit" disabled={pending} className="focus-ring inline-flex h-[2.375rem] items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50"><UserPlus size={16} aria-hidden />{pending ? "Adding…" : "Add"}</button>
      </form>
      {state && <p role="status" className={`text-sm ${state.ok ? "text-mint-soft" : "text-[#ff9a9d]"}`}>{state.message}</p>}
    </div>
  );
}
