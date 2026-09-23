import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { Star } from "lucide-react";
import { dbConfigured } from "@/lib/db";
import { ballotView } from "@/lib/motm-polls";
import { fmtCloses, scoreTitle, shuffled } from "@/lib/motm";
import { fmtDate, gwLabel } from "@/lib/stats";
import { MotmVote } from "@/components/motm-vote";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";

/**
 * The ballot page from the email. The token in the URL is the ballot; nobody signs in. Open: pick a name. Closed: the result.
 * Never indexed, never cached: every view reads the live count (and closes the poll if its time is up).
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Man of the match vote", robots: { index: false, follow: false } };

export default async function BallotPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ pick?: string }> }) {
  const [{ token }, { pick }] = await Promise.all([params, searchParams]);
  if (!dbConfigured() || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const v = await ballotView(token);
  if (!v) notFound();
  const { ballot, poll, match: m, candidates, ballots, counts } = v;
  const first = ballot.player.split(" ")[0];
  const voted = ballots.filter((b) => b.voted).length;
  const open = poll.status === "open";
  const fixture = `${m.seasonId} · ${gwLabel(m)} · ${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })}`;
  const top = counts?.[0]?.votes ?? 0;
  return (
    <PageTransition>
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card-solid pitch p-6 animate-rise sm:p-8">
        <p className="eyebrow">Man of the match · {open ? "vote open" : poll.status === "closed" ? "decided" : "cancelled"}</p>
        <h1 className="display mt-2 text-4xl leading-none text-cream sm:text-5xl">{scoreTitle(m)}</h1>
        <p className="mt-2 text-sm text-ash">{fixture}</p>
        {open ? (
          <>
            <p className="mt-6 text-lg text-cream">Who was the man of the match, {first}?</p>
            <p className="mb-4 mt-1 text-sm text-ash">{ballot.vote ? <>You picked <span className="text-gold">{ballot.vote}</span>. Tap another name to change it.</> : pick && pick !== ballot.player && candidates.some((c) => c.player === pick) ? "Tap once more to confirm, or pick someone else." : "Tap a name. That is the whole job."}</p>
            <MotmVote token={token} voter={ballot.player} candidates={shuffled(candidates, token)} current={ballot.vote} pick={pick ?? null} />
            <p className="mt-5 text-xs text-ash">{voted} of {ballots.length} ballot{ballots.length === 1 ? "" : "s"} in · closes {fmtCloses(poll.closesAt)}, or as soon as everyone has voted.{ballots.length < candidates.length && ` ${candidates.length - ballots.length} of the ${candidates.length} who played ${candidates.length - ballots.length === 1 ? "has" : "have"} no email on the members list, so ${candidates.length - ballots.length === 1 ? "they" : "they"} can be picked but cannot vote.`}</p>
          </>
        ) : poll.status === "closed" && poll.winner ? (
          <>
            <p className="mt-6 flex items-center gap-2 text-sm text-gold"><Star size={16} aria-hidden />Man of the match</p>
            <p className="display mt-1 text-5xl leading-none text-gold sm:text-6xl">{poll.winner}</p>
            <p className="mt-3 text-sm text-ash">{top} of {voted} vote{voted === 1 ? "" : "s"} · {voted} of {ballots.length} ballots came back · {poll.closedBy === "everyone voted" ? "closed early because everyone voted" : poll.closedBy === "deadline" ? `closed ${poll.closedAt ? fmtCloses(poll.closedAt) : "on time"}` : `closed by ${poll.closedBy}`}.{ballot.vote ? ` You went for ${ballot.vote}.` : " You did not vote."}</p>
            {counts && counts.some((c) => c.votes > 0) && (
              <ul className="mt-5 space-y-1.5">
                {counts.filter((c) => c.votes > 0).map((c) => (
                  <li key={c.player} className="flex items-center gap-3 text-sm">
                    <span className={clsx("w-36 shrink-0 truncate sm:w-44", c.player === poll.winner ? "text-gold" : "text-cream")}>{c.player}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><span className={clsx("block h-full rounded-full", c.player === poll.winner ? "bg-gold" : "bg-cream/50")} style={{ width: `${Math.round((c.votes / Math.max(1, top)) * 100)}%` }} /></span>
                    <span className="tabular w-6 text-right text-xs text-ash">{c.votes}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-ash">{poll.status === "closed" ? "The vote closed without a single ballot coming back. The man of the match, if any, is whoever the score reporter said." : `This vote was cancelled: ${poll.closedBy ?? "the game no longer counts"}.`}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/matches/${m.id}`} className={btn("secondary")}>Match page</Link>
          <Link href="/" className={btn("ghost")}>Home</Link>
        </div>
      </section>
      <p className="text-center text-xs text-ash">This link is your ballot, {first}. Forward it and someone else votes as you.</p>
    </div>
    </PageTransition>
  );
}
