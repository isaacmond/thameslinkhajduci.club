import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { LogOut, UserRoundX } from "lucide-react";
import { authEnabled, knownMembers, resolveMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getData } from "@/lib/data";
import { allMembers } from "@/lib/members";
import { slugify } from "@/lib/slug";
import { pendingSubmissions } from "@/lib/writes";
import { signOutAction } from "@/app/actions/auth";
import { PageHeader, SectionTitle } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { PendingAdmin, type PendingItem } from "@/components/pending-admin";
import { MembersAdmin } from "@/components/members-admin";
import { FixturesAdmin } from "@/components/fixtures-admin";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

function SignOut() {
  return <form action={signOutAction}><button type="submit" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-white/10"><LogOut size={16} aria-hidden />Sign out</button></form>;
}

const detailLines = (kind: string, p: Record<string, unknown>): string[] => {
  const list = (o: unknown) => Object.entries((o ?? {}) as Record<string, number>).map(([n, c]) => `${n}${c > 1 ? ` ×${c}` : ""}`).join(", ");
  if (kind === "score") return [p.scorers && Object.keys(p.scorers as object).length ? `Scorers: ${list(p.scorers)}` : "", p.assists && Object.keys(p.assists as object).length ? `Assists: ${list(p.assists)}` : "", p.motm ? `MOTM: ${p.motm}` : "", Array.isArray(p.played) ? `Played: ${(p.played as string[]).join(", ")}` : "", p.comment ? `Note: ${p.comment}` : ""].filter(Boolean);
  if (kind === "payment") return [p.note ? `Reference: ${p.note}` : ""].filter(Boolean);
  return [p.nickname ? `Nickname: ${p.nickname}` : "", Array.isArray(p.positions) && (p.positions as string[]).length ? `Position: ${(p.positions as string[]).join("/")}` : "", p.photo ? `Photo: ${p.photo}` : ""].filter(Boolean);
};

export default async function AccountPage() {
  if (!authEnabled()) {
    return (
      <PageTransition><div className="space-y-6">
        <PageHeader eyebrow="Members" title="Sign-in is not switched on yet" sub="The club admin still has to finish connecting WorkOS. Until then, use the Submit page and the admin will apply your changes." />
        <Link href="/submit" className="link">Go to Submit →</Link>
      </div></PageTransition>
    );
  }
  const { user } = await withAuth(); // the proxy already sent anonymous visitors to sign in; this is the belt to its braces
  if (!user) redirect("/sign-in");
  const member = await resolveMember(user.email);
  if (!member) {
    return (
      <PageTransition><div className="space-y-6">
        <PageHeader eyebrow="Members" title="Not on the team sheet" sub={<>You are signed in as <span className="text-cream">{user.email}</span>, but that address is not on the club list. Ask Isaac to add it, or sign in with a different one.</>} />
        <div className="card flex flex-wrap items-center gap-4 p-5"><UserRoundX size={20} className="text-ash" aria-hidden /><p className="text-sm text-ash">Anyone can still use the <Link href="/submit" className="link">Submit page</Link>; the admin approves those.</p><span className="ml-auto"><SignOut /></span></div>
      </div></PageTransition>
    );
  }
  const data = await getData();
  const p = data.players.find((x) => x.name === member.player);
  const takenShirts: Record<string, string> = {};
  for (const x of data.players) if (x.extra.shirt) takenShirts[String(x.extra.shirt)] = x.name;
  const initial = { player: member.player, email: user.email, firstName: user.firstName ?? "", lastName: user.lastName ?? "", nickname: p?.extra.nickname ?? "", positions: p?.extra.positions ?? [], shirt: p?.extra.shirt ?? null, bio: p?.extra.bio ?? "", photo: p?.extra.photo ?? null, takenShirts };
  const slug = p?.slug ?? slugify(member.player);
  const live = dbConfigured();

  let adminUi: React.ReactNode = null;
  if (member.admin && live) {
    const [pending, members] = await Promise.all([pendingSubmissions(), knownMembers()]);
    const fixed = new Set(allMembers().flatMap((m) => m.emails.map((e) => e.toLowerCase())));
    const roster = [...new Set([...data.players.map((x) => x.name), ...data.seasons.flatMap((s) => s.players)])].sort((a, b) => a.localeCompare(b));
    const items: PendingItem[] = pending.map((s) => ({ id: s.id, kind: s.kind, summary: s.summary, submittedBy: s.submittedBy, createdAt: s.createdAt.toISOString(), details: detailLines(s.kind, s.payload) }));
    const seasons = [...data.seasons, ...(data.friendlies ? [data.friendlies] : [])].map((s) => ({ id: s.id, number: s.number, title: s.title, venue: s.venue, period: s.period, pitchCost: (() => { const c = s.matches.map((m) => m.matchCost).filter((x) => x > 0); return c.length ? c.sort((a, b) => a - b)[Math.floor(c.length / 2)] : null; })(), paidBy: data.money.paidBy[s.id] ?? s.summary.paidBy ?? null, seasonCost: s.summary.seasonCost, isCurrent: s.isCurrent }));
    const fixtures = data.matches.map((m) => ({ id: m.id, seasonId: m.seasonId, gw: m.gw, date: m.date, kickOff: m.kickOff, opponent: m.opponent, type: m.seasonId === "FR" && m.type === "Friendly" ? null : m.type, matchCost: m.matchCost, played: m.played }));
    adminUi = (
      <>
        <section id="pending" className="card p-5 sm:p-6">
          <SectionTitle sub="Results, payments and new players sent in by people who were not signed in. Recording one writes it into the records; the site follows within a minute.">Waiting for approval{pending.length ? ` · ${pending.length}` : ""}</SectionTitle>
          <PendingAdmin items={items} />
        </section>
        <section id="members" className="card p-5 sm:p-6">
          <SectionTitle sub="Anyone listed here can sign in with that address, edit their own profile, and have their submissions recorded straight away. Add someone by picking their name and typing their email; it takes effect immediately.">Members</SectionTitle>
          <MembersAdmin members={members.flatMap((m) => m.emails.map((e) => ({ email: e, player: m.player, admin: Boolean(m.admin), fixed: fixed.has(e.toLowerCase()) })))} roster={roster} me={user.email} />
        </section>
        <section id="fixtures" className="card p-5 sm:p-6">
          <SectionTitle sub="Seasons and fixtures used to live on the spreadsheet tabs; they live here now. Add next week's game, fix a date, or start a season.">Seasons &amp; fixtures</SectionTitle>
          <FixturesAdmin seasons={seasons} fixtures={fixtures} roster={roster} />
        </section>
      </>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow="Your account" title={member.player} sub={<>Your details as the site shows them. Submissions you make while signed in go straight into the records{live ? "" : " once the database is connected"}.</>} right={<div className="flex flex-wrap items-center gap-2"><Link href={`/squad/${slug}`} className="focus-ring inline-flex items-center rounded-lg bg-mint px-4 py-2.5 text-sm font-semibold text-night hover:bg-mint-soft">Your player page →</Link><SignOut /></div>} />
      {!live && <p className="card border-gold/40 p-4 text-sm text-ash">Saving is not switched on yet: the records database is not connected. You can look, but the save button will tell you the same.</p>}
      <ProfileForm initial={initial} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["Submit a score", "/submit", "Recorded as soon as you send it."], ["Log a payment", `/submit?type=payment&player=${encodeURIComponent(member.player)}`, "Straight onto the money page."], ["Add a player", "/submit?type=player", "New signings join the roster instantly."]] as const).map(([t, href, sub]) => (
          <Link key={href} href={href} className="card focus-ring block p-4 transition-colors hover:bg-white/[0.06]"><p className="display text-2xl text-cream">{t}</p><p className="mt-1 text-xs text-ash">{sub}</p></Link>
        ))}
      </div>
      {adminUi}
    </div>
    </PageTransition>
  );
}
