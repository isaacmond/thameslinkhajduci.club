"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check } from "lucide-react";
import { voteMotmAction, type VoteState } from "@/app/actions/motm";
import { MotmStar } from "./ui";

export type VoteCandidate = { player: string; goals: number; assists: number };

/**
 * The ballot itself: one button per team-mate, the current pick marked. A tap votes straight away (and can be changed until the
 * poll closes); the `pick` from the email link is highlighted so the second tap is obvious. When the last ballot closes the poll
 * the page refreshes into the result.
 */
export function MotmVote({ token, voter, candidates, current, pick }: { token: string; voter: string; candidates: VoteCandidate[]; current: string | null; pick: string | null }) {
  const router = useRouter();
  const [vote, setVote] = useState<string | null>(current);
  const [state, setState] = useState<VoteState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const choose = (name: string) => {
    if (name === voter || pending) return;
    setBusy(name);
    start(async () => {
      const r = await voteMotmAction(token, name);
      setState(r); setBusy(null);
      if (r?.ok) setVote(r.vote ?? name);
      if (r?.closed) router.refresh();
    });
  };
  const did = (c: VoteCandidate) => [c.goals ? `${c.goals} goal${c.goals === 1 ? "" : "s"}` : "", c.assists ? `${c.assists} assist${c.assists === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {candidates.map((c) => {
          const me = c.player === voter, picked = vote === c.player, suggested = !vote && pick === c.player;
          return (
            <li key={c.player}>
              <button type="button" onClick={() => choose(c.player)} disabled={me || pending} aria-pressed={picked} title={me ? "You cannot vote for yourself" : undefined}
                className={clsx("focus-ring flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed", picked ? "border-gold/60 bg-gold/15 text-gold" : suggested ? "border-accent/60 bg-accent/10 text-ink hover:bg-accent/20" : me ? "border-ink/5 bg-ink/[0.02] text-muted/60" : "border-ink/10 bg-ink/5 text-ink hover:bg-ink/10")}>
                <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", picked ? "border-gold bg-gold text-paper" : "border-ink/25")} aria-hidden>{picked ? <Check size={14} /> : null}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.player}{me && <span className="ml-2 text-xs font-normal text-muted">(you, sadly ineligible)</span>}</span>
                  {did(c) && <span className="block text-xs text-muted">{did(c)}</span>}
                </span>
                {busy === c.player && <span className="text-xs text-muted">Saving…</span>}
                {suggested && busy !== c.player && <span className="text-xs text-accent">Tap to confirm</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {state && <p role="status" className={clsx("flex items-center gap-2 text-sm", state.ok ? "text-accent" : "text-loss")}>{state.ok && <MotmStar />}{state.message}</p>}
    </div>
  );
}
