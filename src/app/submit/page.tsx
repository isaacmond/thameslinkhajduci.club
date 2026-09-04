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
import type { SignedIn } from "@/components/signed-in-note";

/** Reads the session, so this page renders per request (the data underneath is still the cached records). */
export const dynamic = "force-dynamic";

type Params = Promise<{ match?: string; type?: string; player?: string }>;
const COPY: Record<SubmitKind, { eyebrow: string; title: string; sub: string; description: string }> = {
  score: { eyebrow: "Match report", title: "Submit a score", sub: "Just played? Put the result, scorers and line-up in here. It goes to the admin for approval and shows up on the site once it's checked, so nobody can slip a 14–0 past us.", description: "Report a result, scorers and line-up for approval by the club admin." },
  payment: { eyebrow: "Settle up", title: "Log a payment", sub: "Paid your share of the pitch? Say who, how much and when. The admin checks it against the bank and ticks it off; the Money page updates once it's done.", description: "Tell the admin you have paid your share of pitch hire." },
  player: { eyebrow: "New signing", title: "Add a player", sub: "Someone new pulled on the shirt? Put their details in and the admin adds them to the roster, so they can be picked in match reports and start racking up numbers.", description: "Propose a new player for the Thameslink Hajduci roster." },
};
const SIGNED_IN_COPY: Record<SubmitKind, { direct: string; queued: string }> = {
  score: { direct: "Just played? Put the result, scorers and line-up in here. You are signed in, so it goes straight into the records and the site follows within a minute.", queued: "Just played? Put the result, scorers and line-up in here. You are signed in, so no need to say who you are; the admin still applies it for now." },
  payment: { direct: "Paid your share of the pitch? Say who, how much and when. You are signed in, so it lands on the Payments tab immediately.", queued: "Paid your share of the pitch? Say who, how much and when. You are signed in, so no need to say who you are; the admin still ticks it off for now." },
  player: { direct: "Someone new pulled on the shirt? Put their details in and they join the roster straight away.", queued: "Someone new pulled on the shirt? Put their details in. You are signed in, so no need to say who you are; the admin still adds them for now." },
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
    const toFixture = (m: (typeof pool)[number]): SubmitFixture => ({
      id: m.id, seasonId: m.seasonId, gw: m.gw, opponent: m.opponent, date: m.date, played: m.played, ourGoals: m.ourGoals, theirGoals: m.theirGoals,
      label: `${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })} · ${m.seasonId === "FR" ? "Friendly" : gwLabel(m)} vs ${m.opponent}${m.played ? ` (${m.ourGoals}–${m.theirGoals} recorded)` : ""}`,
      lineup: m.lineup.filter((l) => l.played).map((l) => l.player),
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
