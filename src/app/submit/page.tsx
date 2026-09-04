import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { chronological, fmtDate, gwLabel } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ScoreForm, type SubmitFixture } from "@/components/score-form";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Submit a score", description: "Report a result, scorers and line-up for approval by the club admin." };

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const { match } = await searchParams;
  const data = await getData();
  const today = londonToday();
  const current = data.seasons.find((s) => s.isCurrent);
  const pool = chronological([...(current ? current.matches : []), ...(data.friendlies ? data.friendlies.matches : [])]);
  // Most recent past fixture first: that's the one someone has just played.
  const past = pool.filter((m) => !m.date || m.date <= today).reverse(), future = pool.filter((m) => m.date && m.date > today);
  const toFixture = (m: (typeof pool)[number]): SubmitFixture => ({
    id: m.id, seasonId: m.seasonId, gw: m.gw, opponent: m.opponent, date: m.date, played: m.played, ourGoals: m.ourGoals, theirGoals: m.theirGoals,
    label: `${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })} · ${m.seasonId === "FR" ? "Friendly" : gwLabel(m)} vs ${m.opponent}${m.played ? ` (${m.ourGoals}–${m.theirGoals} recorded)` : ""}`,
    lineup: m.lineup.filter((l) => l.played).map((l) => l.player),
    scorers: Object.fromEntries(m.lineup.filter((l) => l.goals > 0).map((l) => [l.player, l.goals])),
    assists: Object.fromEntries(m.lineup.filter((l) => l.assists > 0).map((l) => [l.player, l.assists])),
    motm: m.motm,
  });
  const fixtures = [...past, ...future].map(toFixture);
  const roster = [...new Set([...(current?.players ?? []), ...data.players.map((p) => p.name)])].sort((a, b) => a.localeCompare(b));
  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow="Match report" title="Submit a score" sub="Just played? Put the result, scorers and line-up in here. It goes to the admin for approval and shows up on the site once it's checked, so nobody can slip a 14–0 past us." />
      <ScoreForm fixtures={fixtures} roster={roster} initialMatch={match} webhook={Boolean(process.env.SCORE_WEBHOOK_URL)} />
    </div>
    </PageTransition>
  );
}
