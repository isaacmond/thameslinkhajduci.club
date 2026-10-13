import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { dbConfigured } from "@/lib/db";
import { ballotView } from "@/lib/motm-polls";
import { fmtCloses, scoreTitle, shuffled } from "@/lib/motm";
import { fmtDate, gwLabel } from "@/lib/stats";
import { MotmVote } from "@/components/motm-vote";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";
import { MotmStar } from "@/components/ui";

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
  const fixture = `Season ${m.seasonId.replace(/^S/, "")} · ${gwLabel(m)} · ${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })}`;
  const top = counts?.[0]?.votes ?? 0;
  return (
    <PageTransition>
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card p-6 animate-rise sm:p-8">
        <p className="eyebrow">Man of the match · {open ? "vote open" : poll.status === "closed" ? "result" : "cancelled"}</p>
        <h1 className="display mt-3 text-4xl leading-none text-ink sm:text-5xl">{scoreTitle(m)}</h1>
        <p className="mt-2 text-sm text-muted">{fixture}</p>
        {open ? (
          <>
            <p className="display mt-8 text-2xl text-ink">Who was the man of the match?</p>
            <p className="mb-4 mt-1 text-sm text-muted">{ballot.vote ? <>You picked <span className="text-gold">{ballot.vote}</span>. Tap another name to change it.</> : pick && pick !== ballot.player && candidates.some((c) => c.player === pick) ? "Tap once more to confirm, or pick someone else." : "Tap a name to vote."}</p>
            <MotmVote token={token} voter={ballot.player} candidates={shuffled(candidates, token)} current={ballot.vote} pick={pick ?? null} />
            <p className="mt-5 text-xs text-muted">{voted} of {ballots.length} ballot{ballots.length === 1 ? "" : "s"} returned · closes {fmtCloses(poll.closesAt)}, or once everyone has voted.{ballots.length < candidates.length && ` ${candidates.length - ballots.length} of the ${candidates.length} who played ${candidates.length - ballots.length === 1 ? "has" : "have"} no email on the members list, so can be voted for but cannot vote.`}</p>
          </>
        ) : poll.status === "closed" && poll.winner ? (
          <>
            <p className="mt-8 flex items-center gap-2 text-sm text-gold"><MotmStar />Man of the match</p>
            <p className="display mt-1 text-5xl leading-none text-ink sm:text-6xl">{poll.winner}</p>
            <p className="mt-3 text-sm text-muted">{top} of {voted} vote{voted === 1 ? "" : "s"} · {voted} of {ballots.length} ballots returned.{ballot.vote ? ` You voted for ${ballot.vote}.` : ""}</p>
            {counts && counts.some((c) => c.votes > 0) && (
              <ul className="mt-5 space-y-1.5">
                {counts.filter((c) => c.votes > 0).map((c) => (
                  <li key={c.player} className="flex items-center gap-3 text-sm">
                    <span className={clsx("w-36 shrink-0 truncate sm:w-44", c.player === poll.winner ? "text-gold" : "text-ink")}>{c.player}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10"><span className={clsx("block h-full rounded-full", c.player === poll.winner ? "bg-gold" : "bg-ink/50")} style={{ width: `${Math.round((c.votes / Math.max(1, top)) * 100)}%` }} /></span>
                    <span className="tabular w-6 text-right text-xs text-muted">{c.votes}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">{poll.status === "closed" ? "The vote closed without any ballots returned." : "This vote was cancelled."}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/matches/${m.id}`} className={btn("secondary")}>Match page</Link>
          <Link href="/" className={btn("ghost")}>Home</Link>
        </div>
      </section>
      <p className="text-center text-xs text-muted">This link is your personal ballot, {first}. Please don&apos;t forward it.</p>
    </div>
    </PageTransition>
  );
}
