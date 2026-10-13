"use client";
import { useActionState, useState, useTransition } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { addMemberAction, removeMemberAction, setAdminAction, type ActionState } from "@/app/actions/admin";
import { FormStatus, inputClass, Select, Switch, fieldClass } from "./controls";
import { btn } from "./button";

export type MemberRow = { email: string; player: string; admin: boolean };

/** Who can sign in. Any address can be removed except your own and the last admin's. */
export function MembersAdmin({ members, roster, me }: { members: MemberRow[]; roster: string[]; me: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMemberAction, null);
  const [player, setPlayer] = useState(roster[0] ?? "");
  const [admin, setAdmin] = useState(false);
  const [removed, setRemoved] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const remove = (email: string) => start(async () => setRemoved(await removeMemberAction(email)));
  const toggleAdmin = (player: string, makeAdmin: boolean) => start(async () => setRemoved(await setAdminAction(player, makeAdmin)));
  const byPlayer = new Map<string, MemberRow[]>();
  for (const m of members) byPlayer.set(m.player, [...(byPlayer.get(m.player) ?? []), m]);
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-ink/8 text-sm">
        {[...byPlayer.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([p, rows]) => (
          <li key={p} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="inline-flex w-40 shrink-0 items-center gap-1 font-medium text-ink">{p}{rows.some((r) => r.admin) && <ShieldCheck size={14} className="shrink-0 text-accent" aria-label="admin" />}</span>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
              {rows.map((r) => (
                <li key={r.email} className="chip gap-2">
                  <span className="font-normal tracking-normal text-ink/90">{r.email}</span>
                  {r.email.toLowerCase() === me.toLowerCase() ? <span className="text-muted" title="That is you">·</span> : <button type="button" onClick={() => remove(r.email)} disabled={busy} aria-label={`Remove ${r.email}`} className="focus-ring text-muted hover:text-loss"><Trash2 size={12} aria-hidden /></button>}
                </li>
              ))}
            </ul>
            <button type="button" disabled={busy} onClick={() => toggleAdmin(p, !rows.some((r) => r.admin))} className={btn("ghost", "xs")}>{rows.some((r) => r.admin) ? "Remove admin" : "Make admin"}</button>
          </li>
        ))}
      </ul>
      {removed && <FormStatus tone={removed.ok ? "ok" : "error"}>{removed.message}</FormStatus>}
      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className={fieldClass}><span className="eyebrow">Email</span><input name="email" type="email" required placeholder="name@example.com" className={inputClass} /></label>
        <Select label="Signs in as" value={player} onChange={setPlayer} options={roster.map((r) => ({ value: r, label: r }))} />
        <input type="hidden" name="player" value={player} />
        <Switch name="admin" checked={admin} onChange={setAdmin} label="Admin" className="h-control" />
        <button type="submit" disabled={pending} className={btn("primary")}><UserPlus size={16} aria-hidden />{pending ? "Adding…" : "Add"}</button>
      </form>
      {state && <FormStatus tone={state.ok ? "ok" : "error"}>{state.message}</FormStatus>}
    </div>
  );
}
