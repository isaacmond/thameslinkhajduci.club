import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ShieldOff } from "lucide-react";
import { authEnabled, knownMembers, resolveMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getData } from "@/lib/data";
import { listSquads, pendingSubmissions } from "@/lib/writes";
import { fmtDate, gwLabel } from "@/lib/stats";
import { londonToday } from "@/lib/time";
import { PageHeader, SectionTitle } from "@/components/ui";
import { PendingAdmin, type PendingItem } from "@/components/pending-admin";
import { MembersAdmin } from "@/components/members-admin";
import { FixturesAdmin } from "@/components/fixtures-admin";
import { SquadAdmin } from "@/components/squad-admin";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const detailLines = (kind: string, p: Record<string, unknown>): string[] => {
  const list = (o: unknown) => Object.entries((o ?? {}) as Record<string, number>).map(([n, c]) => `${n}${c > 1 ? ` ×${c}` : ""}`).join(", ");
  if (kind === "score") return [p.scorers && Object.keys(p.scorers as object).length ? `Scorers: ${list(p.scorers)}` : "", p.assists && Object.keys(p.assists as object).length ? `Assists: ${list(p.assists)}` : "", p.motm ? `MOTM: ${p.motm}` : "", Array.isArray(p.played) ? `Played: ${(p.played as string[]).join(", ")}` : "", p.comment ? `Note: ${p.comment}` : ""].filter(Boolean);
  if (kind === "payment") return [p.note ? `Reference: ${p.note}` : ""].filter(Boolean);
  return [p.nickname ? `Nickname: ${p.nickname}` : "", Array.isArray(p.positions) && (p.positions as string[]).length ? `Position: ${(p.positions as string[]).join("/")}` : "", p.photo ? `Photo: ${p.photo}` : ""].filter(Boolean);
};

/** The club admin's desk: approvals, members, seasons and fixtures. Admin-only; everyone else is shown the door politely. */
export default async function AdminPage() {
  if (!authEnabled() || !dbConfigured()) redirect("/account");
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const member = await resolveMember(user.email);
  if (!member?.admin) {
    return (
      <PageTransition><div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Admins only" sub="This page is for the club admin. Your own profile and submissions are on your account page." />
        <div className="card flex flex-wrap items-center gap-4 p-5"><ShieldOff size={20} className="text-ash" aria-hidden /><Link href="/account" className="link">Back to your account →</Link></div>
      </div></PageTransition>
    );
  }
  const [data, pending, members, squadRows] = await Promise.all([getData(), pendingSubmissions(), knownMembers(), listSquads()]);
  const roster = [...new Set([...data.players.map((x) => x.name), ...data.seasons.flatMap((s) => s.players)])].sort((a, b) => a.localeCompare(b));
  const items: PendingItem[] = pending.map((s) => ({ id: s.id, kind: s.kind, summary: s.summary, submittedBy: s.submittedBy, createdAt: s.createdAt.toISOString(), details: detailLines(s.kind, s.payload) }));
  const seasons = [...data.seasons, ...(data.friendlies ? [data.friendlies] : [])].map((s) => ({ id: s.id, number: s.number, title: s.title, venue: s.venue, venueUrl: s.venueUrl, period: s.period, pitchCost: (() => { const c = s.matches.map((m) => m.matchCost).filter((x) => x > 0); return c.length ? c.sort((a, b) => a - b)[Math.floor(c.length / 2)] : null; })(), paidBy: data.money.paidBy[s.id] ?? s.summary.paidBy ?? null, seasonCost: s.summary.seasonCost, fixtures: s.matches.length, isCurrent: s.isCurrent }));
  const today = londonToday();
  const upcoming = data.matches.filter((m) => !m.played && (!m.date || m.date >= today) && !/forfeit|cancel/i.test(m.type ?? "")).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999")).slice(0, 8)
    .map((m) => ({ id: m.id, date: m.date, label: `${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })}${m.kickOff ? ` ${m.kickOff}` : ""} · ${m.seasonId === "FR" ? "Friendly" : `${m.seasonId} ${gwLabel(m)}`} vs ${m.opponent}` }));
  const emailed = new Set(members.filter((m) => m.emails.length).map((m) => m.player.toLowerCase()));
  const squadRoster = roster.map((name) => ({ name, shirt: data.players.find((p) => p.name === name)?.extra.shirt ?? null, hasEmail: emailed.has(name.toLowerCase()) }));
  const squads = Object.fromEntries(squadRows.map((s) => [s.matchId, { players: s.players, note: s.note, remindedAt: s.remindedAt ? s.remindedAt.toISOString() : null }]));
  const fixtures = data.matches.map((m) => ({ id: m.id, seasonId: m.seasonId, gw: m.gw, date: m.date, kickOff: m.kickOff, opponent: m.opponent, type: m.seasonId === "FR" && m.type === "Friendly" ? null : m.type, matchCost: m.matchCost, played: m.played }));

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="The desk" sub="Approvals, who can sign in, and the fixture list. Everything here writes straight to the records; the site follows within a minute." right={<Link href="/account" className="focus-ring inline-flex items-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-white/10">Your account →</Link>} />
      <nav aria-label="Admin sections" className="flex flex-wrap gap-2 text-sm">
        {[["#pending", `Approvals${pending.length ? ` (${pending.length})` : ""}`], ["#squad", "Team sheet"], ["#members", "Members"], ["#fixtures", "Seasons & fixtures"]].map(([href, label]) => <a key={href} href={href} className="chip focus-ring hover:bg-white/10">{label}</a>)}
      </nav>
      <section id="pending" className="card scroll-mt-24 p-5 sm:p-6">
        <SectionTitle sub="Results, payments and new players sent in by people who were not signed in. Recording one writes it into the records.">Waiting for approval{pending.length ? ` · ${pending.length}` : ""}</SectionTitle>
        <PendingAdmin items={items} />
      </section>
      <section id="squad" className="card scroll-mt-24 p-5 sm:p-6">
        <SectionTitle sub="Who is expected for the next game. Everyone picked gets an email the day before with the details, the squad and your note; you can also send it straight away. The fixture page shows the squad too.">Team sheet</SectionTitle>
        <SquadAdmin fixtures={upcoming} roster={squadRoster} squads={squads} />
      </section>
      <section id="members" className="card scroll-mt-24 p-5 sm:p-6">
        <SectionTitle sub="Anyone listed here can sign in with that address, edit their own profile, have their submissions recorded straight away, and get team-sheet reminders. Pick a name, type the email, done. Admins see this page.">Members</SectionTitle>
        <MembersAdmin members={members.flatMap((m) => m.emails.map((e) => ({ email: e, player: m.player, admin: Boolean(m.admin) })))} roster={roster} me={user.email} />
      </section>
      <section id="fixtures" className="card scroll-mt-24 p-5 sm:p-6">
        <SectionTitle sub="Add next week's game, fix a date or opponent, mark a forfeit, or start a new season.">Seasons &amp; fixtures</SectionTitle>
        <FixturesAdmin seasons={seasons} fixtures={fixtures} roster={roster} />
      </section>
    </div>
    </PageTransition>
  );
}
