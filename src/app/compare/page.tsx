import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import type { ClubData } from "@/lib/types";
import { attendance, chronological, goalContext, playedMatches, playerStreaks } from "@/lib/stats";
import { Empty, PageHeader } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";
import { Compare, type CompareMatch, type ComparePlayer } from "@/components/compare";
import { btn } from "@/components/button";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

/** Everything the duel needs per player, precomputed once on the server so the browser only ever does arithmetic. */
function buildPlayers(data: ClubData): ComparePlayer[] {
  return [...data.players].sort((a, b) => b.apps - a.apps || b.goals - a.goals || a.name.localeCompare(b.name)).map((p) => {
    const st = playerStreaks(data, p.name), gc = goalContext(data, p.name), att = attendance(data, p.name);
    return {
      name: p.name, slug: p.slug, photo: p.extra.photo, nickname: p.extra.nickname, shirt: p.extra.shirt ?? null, positions: p.extra.positions ?? [],
      apps: p.apps, goals: p.goals, assists: p.assists, motm: p.motm, wins: p.wins, draws: p.draws, losses: p.losses,
      goalsPerGame: p.goalsPerGame, assistsPerGame: p.assistsPerGame, gpgGames: p.gpgGames, apgGames: p.apgGames, winRate: p.winRate,
      debut: p.debut, seasons: p.seasons.map((s) => ({ seasonId: s.seasonId, apps: s.apps, goals: s.goals, assists: s.assists })),
      attendancePct: att.pct, attendanceApps: att.apps, attendancePossible: att.possible,
      longestScoringRun: st.longestScoringRun, goalsInWins: gc.inWins, consolation: gc.consolation,
    };
  });
}
/** Counted games only, oldest first, with who actually played. */
function buildMatches(data: ClubData): CompareMatch[] {
  return chronological(playedMatches(data.matches)).map((m) => ({ id: m.id, result: m.result!, ourGoals: m.ourGoals!, theirGoals: m.theirGoals!, date: m.date, players: m.lineup.filter((l) => l.played).map((l) => l.player) }));
}
/** Resolve ?a= and ?b= against the squad; fall back to the two most-capped players and never let a man face himself. */
function pickPair(players: ComparePlayer[], sp: Awaited<Search>): [ComparePlayer, ComparePlayer] | null {
  if (players.length < 2) return null;
  const find = (v: string | string[] | undefined) => (typeof v === "string" ? players.find((p) => p.slug === v) : undefined);
  const a = find(sp.a) ?? players[0];
  let b = find(sp.b);
  if (!b || b.slug === a.slug) b = players.find((p) => p.slug !== a.slug)!;
  return [a, b];
}

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const [data, sp] = await Promise.all([getData(), searchParams]);
  const pair = pickPair(buildPlayers(data), sp);
  if (!pair) return { title: "Compare", description: "Put any two Thameslink Hajduci players side by side." };
  const [a, b] = pair;
  return { title: `${a.name} v ${b.name}`, description: `${a.name} (${a.apps} appearances, ${a.goals} goals) and ${b.name} (${b.apps} appearances, ${b.goals} goals), side by side.` };
}

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const [data, sp] = await Promise.all([getData(), searchParams]);
  const players = buildPlayers(data);
  const pair = pickPair(players, sp);
  const seasons = data.seasons.map((s) => s.id);

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Side by side" title="Compare players" sub="Choose any two players to compare their records." right={<Link href="/stats" className={btn("secondary", "xs")}>Statistics</Link>} />
      {pair ? (
        <Compare key={`${pair[0].slug}|${pair[1].slug}`} players={players} matches={buildMatches(data)} seasons={seasons} initialA={pair[0].slug} initialB={pair[1].slug} />
      ) : (
        <Empty>At least two players are needed to compare.</Empty>
      )}
    </div>
    </PageTransition>
  );
}
