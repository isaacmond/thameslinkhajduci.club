"use client";
import { useState, useTransition } from "react";
import { Check, Inbox, X } from "lucide-react";
import { approveSubmissionAction, rejectSubmissionAction, type ActionState } from "@/app/actions/admin";

export type PendingItem = { id: number; kind: string; summary: string; submittedBy: string; createdAt: string; details: string[] };

/** The admin's approval queue: what anonymous visitors submitted, one tap to record or bin each. */
export function PendingAdmin({ items }: { items: PendingItem[] }) {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const run = (id: number, fn: (id: number) => Promise<ActionState>) => { setBusy(id); start(async () => { setState(await fn(id)); setBusy(null); }); };
  if (!items.length) return <p className="flex items-center gap-2 text-sm text-ash"><Inbox size={16} aria-hidden />Nothing waiting. {state?.ok && <span className="text-mint-soft">{state.message}</span>}</p>;
  return (
    <div className="space-y-3">
      {state && <p role="status" className={`text-sm ${state.ok ? "text-mint-soft" : "text-loss-soft"}`}>{state.message}</p>}
      <ul className="divide-y divide-white/10">
        {items.map((it) => (
          <li key={it.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">{it.kind} · {new Date(it.createdAt).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · from {it.submittedBy}</p>
              <p className="mt-0.5 font-medium text-cream">{it.summary}</p>
              {it.details.length > 0 && <ul className="mt-1 text-xs text-ash">{it.details.map((d) => <li key={d}>{d}</li>)}</ul>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={pending} onClick={() => run(it.id, approveSubmissionAction)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-mint px-3 py-2 text-sm font-semibold text-night hover:bg-mint-soft disabled:opacity-50"><Check size={16} aria-hidden />{busy === it.id ? "Recording…" : "Record it"}</button>
              <button type="button" disabled={pending} onClick={() => run(it.id, rejectSubmissionAction)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-cream hover:bg-white/10 disabled:opacity-50"><X size={16} aria-hidden />Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
