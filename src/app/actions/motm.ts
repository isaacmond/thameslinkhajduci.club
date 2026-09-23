"use server";
import { revalidatePath } from "next/cache";
import { purge } from "@/lib/apply";
import { dbConfigured } from "@/lib/db";
import { castVote } from "@/lib/motm-polls";
import { clean } from "@/lib/submissions";

/**
 * A vote from the ballot page. The token in the link is the whole credential: whoever holds it is the player it was sent to.
 * No sign-in, because half the squad never will.
 */
export type VoteState = { ok: boolean; message: string; vote?: string; closed?: boolean } | null;

export async function voteMotmAction(token: string, candidate: string): Promise<VoteState> {
  if (!dbConfigured()) return { ok: false, message: "The records database is not connected." };
  const t = clean(token, 64), c = clean(candidate, 60);
  if (!t || !c) return { ok: false, message: "Pick a name." };
  const r = await castVote(t, c);
  revalidatePath(`/motm/${t}`);
  if (!r.ok) return { ok: false, message: r.error, closed: r.closed };
  revalidatePath(`/matches/${r.matchId}`);
  if (r.closed) purge(); // the winner is in the records now: every page that shows MOTMs is stale
  return { ok: true, vote: r.vote, closed: Boolean(r.closed), message: r.closed ? `${r.vote} it is. Yours was the last ballot, so the vote is closed${r.closed.winner ? `: ${r.closed.winner} is man of the match` : ""}.` : `Voted for ${r.vote}. You can change your mind until the poll closes.` };
}
