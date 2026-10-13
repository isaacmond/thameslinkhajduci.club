import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { chronological, fmtDate, gwLabel } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ScoreForm, type SubmitFixture } from "@/components/score-form";
import { PaymentForm } from "@/components/payment-form";
import { PlayerForm } from "@/components/player-form";
import { SubmitTabs, type SubmitKind } from "@/components/submit-tabs";
import { PageTransition } from "@/components/page-transition";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { listSquads } from "@/lib/writes";
import { appearanceCounts, levyWindow } from "@/lib/ringers";
import type { SignedIn } from "@/components/signed-in-note";

/** Reads the session, so this page renders per request (the data underneath is still the cached records). */
export const dynamic = "force-dynamic";

type Params = Promise<{ match?: string; type?: string; player?: string }>;
const COPY: Record<SubmitKind, { eyebrow: string; title: string; sub: string; description: string }> = {
  score: { eyebrow: "Match report", title: "Add a result", sub: "Enter the score, the line-up, and who scored and assisted. The admin approves it before it appears on the site.", description: "Report a result, scorers and line-up for approval by the club admin." },
  payment: { eyebrow: "Pitch fees", title: "Record a payment", sub: "Say who paid, how much and when. The admin confirms it and the Money page updates.", description: "Record a payment towards pitch fees." },
  player: { eyebrow: "New player", title: "Add a player", sub: "Add a new player to the squad so they can be picked in match reports.", description: "Add a new player to the Thameslink Hajduci squad." },
};
const SIGNED_IN_COPY: Record<SubmitKind, { direct: string; queued: string }> = {
  score: { direct: "Enter the score, the line-up, and who scored and assisted. You're signed in, so it's recorded straight away.", queued: "Enter the score, the line-up, and who scored and assisted. The admin will approve it." },
  payment: { direct: "Say who paid, how much and when. You're signed in, so it's recorded straight away.", queued: "Say who paid, how much and when. The admin will confirm it." },
  player: { direct: "Add a new player to the squad. You're signed in, so they're added straight away.", queued: "Add a new player to the squad. The admin will confirm it." },
};
const kindOf = (t?: string): SubmitKind => (t === "payment" || t === "player" ? t : "score");

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const c = COPY[kindOf((await searchParams).type)];
  return { title: c.title, description: c.description };
}

export default async function SubmitPage({ searchParams }: { searchParams: Params }) {
  const { match, type, player } = await searchParams;
  const kind = kindOf(type);
  const data = await getData();
  const today = londonToday();
  const current = data.seasons.find((s) => s.isCurrent) ?? data.seasons.at(-1) ?? null;
  const roster = [...new Set([...(current?.players ?? []), ...data.players.map((p) => p.name)])].sort((a, b) => a.localeCompare(b));
  const member = await currentMember();
  const signedIn: SignedIn | null = member ? { player: member.member.player, direct: dbConfigured() } : null;
  const copy = signedIn ? { ...COPY[kind], sub: SIGNED_IN_COPY[kind][signedIn.direct ? "direct" : "queued"] } : COPY[kind];

  let form: React.ReactNode;
  if (kind === "payment") {
    const balance = new Map(data.money.rows.map((r) => [r.player, r.balance]));
    const players = roster.map((name) => ({ name, balance: balance.get(name) ?? null })).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0) || a.name.localeCompare(b.name));
    form = <PaymentForm players={players} payer={(current && data.money.paidBy[current.id]) || null} initialPlayer={player} today={today} signedIn={signedIn} />;
  } else if (kind === "player") {
    const takenShirts: Record<string, string> = {};
    for (const p of data.players) if (p.extra.shirt) takenShirts[String(p.extra.shirt)] = p.name;
    form = <PlayerForm roster={roster} takenShirts={takenShirts} seasonId={current?.id ?? null} signedIn={signedIn} />;
  } else {
    const pool = chronological([...(current ? current.matches : []), ...(data.friendlies ? data.friendlies.matches : [])]);
    // Most recent past fixture first: that's the one someone has just played.
    const past = pool.filter((m) => !m.date || m.date <= today).reverse(), future = pool.filter((m) => m.date && m.date > today);
    // The admin's team sheets: a fixture without a recorded line-up starts from the expected squad, so the reporter only has to untick who didn't show.
    const rosterSet = new Set(roster);
    const squads = dbConfigured() ? await listSquads().catch(() => []) : [];
    const expected = new Map(squads.map((s) => [s.matchId, s.players.filter((p) => rosterSet.has(p))]));
    // The league games before each fixture that count towards the ringer levy; the form adds the night's own ticks on top.
    const counted = data.matches.filter((m) => m.countsForRecords && m.played);
    const priorApps = (m: (typeof pool)[number]) => appearanceCounts(levyWindow({ ...m, played: false }, counted).slice(m.countsForRecords ? -9 : -10));
    const toFixture = (m: (typeof pool)[number]): SubmitFixture => ({
      id: m.id, seasonId: m.seasonId, gw: m.gw, opponent: m.opponent, date: m.date, played: m.played, ourGoals: m.ourGoals, theirGoals: m.theirGoals,
      label: `${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })} · ${m.seasonId === "FR" ? "Friendly" : gwLabel(m)} v ${m.opponent}${m.played ? ` (${m.ourGoals}–${m.theirGoals} recorded)` : ""}`,
      lineup: m.lineup.filter((l) => l.played && !l.ringer).map((l) => l.player),
      ringers: m.lineup.filter((l) => l.played && l.ringer).map((l) => l.player),
      expected: expected.get(m.id) ?? [],
      priorApps: priorApps(m), counted: m.countsForRecords,
      type: m.type, matchCost: m.matchCost, kickOff: m.kickOff,
      scorers: Object.fromEntries(m.lineup.filter((l) => l.goals > 0).map((l) => [l.player, l.goals])),
      assists: Object.fromEntries(m.lineup.filter((l) => l.assists > 0).map((l) => [l.player, l.assists])),
      motm: m.motm,
    });
    form = <ScoreForm fixtures={[...past, ...future].map(toFixture)} roster={roster} initialMatch={match} webhook={Boolean(process.env.SCORE_WEBHOOK_URL || (process.env.RESEND_API_KEY && process.env.SCORE_TO_EMAIL))} signedIn={signedIn} />;
  }

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} sub={copy.sub} />
      <SubmitTabs active={kind} />
      {form}
    </div>
    </PageTransition>
  );
}
