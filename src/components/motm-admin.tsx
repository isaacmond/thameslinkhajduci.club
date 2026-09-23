"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Send, Star, StopCircle, Vote } from "lucide-react";
import { closeMotmPollAction, openMotmPollAction, type ActionState } from "@/app/actions/admin";
import { Select } from "./controls";
import { btn } from "./button";

export type PollItem = { matchId: string; status: string; label: string; score: string; ballots: number; voted: number; closesAt: string; closedAt: string | null; closedBy: string | null; winner: string | null; noVote: number };
export type PollableFixture = { id: string; label: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The admin's view of the man-of-the-match votes: what is open and how many ballots are in, what was decided, a way to call one
 * early, and a way to open (or re-send) the vote on a league result that has none, for games recorded before the vote existed.
 */
export function MotmAdmin({ polls, pollable }: { polls: PollItem[]; pollable: PollableFixture[] }) {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [matchId, setMatchId] = useState(pollable[0]?.id ?? "");
  const run = (id: string, fn: (id: string) => Promise<ActionState>) => { setBusy(id); start(async () => { setState(await fn(id)); setBusy(null); }); };
  const open = polls.filter((p) => p.status === "open"), done = polls.filter((p) => p.status !== "open");
  return (
    <div className="space-y-5">
      {state && <p role="status" className={`text-sm ${state.ok ? "text-mint-soft" : "text-loss-soft"}`}>{state.message}</p>}
      {open.length > 0 ? (
        <ul className="divide-y divide-white/10">
          {open.map((p) => (
            <li key={p.matchId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="eyebrow">Open · closes {when(p.closesAt)}</p>
                <p className="mt-0.5 font-medium text-cream"><Link href={`/matches/${p.matchId}`} className="link">{p.score}</Link> <span className="text-ash">· {p.label}</span></p>
                <p className="mt-1 text-xs text-ash">{p.voted} of {p.ballots} ballot{p.ballots === 1 ? "" : "s"} in{p.noVote ? ` · ${p.noVote} played without an email, so no ballot` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => run(p.matchId, openMotmPollAction)} title="Email ballots to anyone who played but has not had one (added to the members list since, say)" className={btn("secondary")}><Send size={16} aria-hidden />{busy === p.matchId && pending ? "Working…" : "Send missing ballots"}</button>
                <button type="button" disabled={pending} onClick={() => run(p.matchId, closeMotmPollAction)} className={btn("gold")}><StopCircle size={16} aria-hidden />Close now</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="flex items-center gap-2 text-sm text-ash"><Vote size={16} aria-hidden />No vote open. The next league result opens one automatically.</p>}
      {done.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Decided</p>
          <ul className="space-y-1.5 text-sm">
            {done.map((p) => (
              <li key={p.matchId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1 text-gold"><Star size={12} aria-hidden />{p.winner ?? (p.status === "cancelled" ? "Cancelled" : "No votes")}</span>
                <Link href={`/matches/${p.matchId}`} className="link">{p.score}</Link>
                <span className="text-xs text-ash">{p.label} · {p.voted}/{p.ballots} voted{p.closedBy ? ` · ${p.closedBy}` : ""}{p.closedAt ? ` · ${when(p.closedAt)}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pollable.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Select label="Open a vote on a result that has none" value={matchId} onChange={setMatchId} options={pollable.map((f) => ({ value: f.id, label: f.label }))} className="min-w-0" />
          <button type="button" disabled={pending || !matchId} onClick={() => run(matchId, openMotmPollAction)} className={btn("primary")}><Vote size={16} aria-hidden />{busy === matchId && pending ? "Opening…" : "Open the vote"}</button>
        </div>
      )}
    </div>
  );
}
