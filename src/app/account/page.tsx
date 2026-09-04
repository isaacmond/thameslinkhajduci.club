import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { LogOut, ShieldCheck, UserRoundX } from "lucide-react";
import { authEnabled, resolveMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getData } from "@/lib/data";
import { slugify } from "@/lib/slug";
import { signOutAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

function SignOut() {
  return <form action={signOutAction}><button type="submit" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-white/10"><LogOut size={16} aria-hidden />Sign out</button></form>;
}

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

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow="Your account" title={member.player} sub={<>Your details as the site shows them. Submissions you make while signed in go straight into the records{live ? "" : " once the database is connected"}.</>} right={<div className="flex flex-wrap items-center gap-2">{member.admin && live && <Link href="/admin" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-gold/40 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/10"><ShieldCheck size={16} aria-hidden />Admin</Link>}<Link href={`/squad/${slug}`} className="focus-ring inline-flex items-center rounded-lg border border-transparent bg-mint px-4 py-2.5 text-sm font-semibold text-night hover:bg-mint-soft">Your player page →</Link><SignOut /></div>} />
      {!live && <p className="card border-gold/40 p-4 text-sm text-ash">Saving is not switched on yet: the records database is not connected. You can look, but the save button will tell you the same.</p>}
      <ProfileForm initial={initial} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["Submit a score", "/submit", "Recorded as soon as you send it."], ["Log a payment", `/submit?type=payment&player=${encodeURIComponent(member.player)}`, "Straight onto the money page."], ["Add a player", "/submit?type=player", "New signings join the roster instantly."]] as const).map(([t, href, sub]) => (
          <Link key={href} href={href} className="card focus-ring block p-4 transition-colors hover:bg-white/[0.06]"><p className="display text-2xl leading-none text-cream">{t}</p><p className="mt-1 text-xs text-ash">{sub}</p></Link>
        ))}
      </div>
    </div>
    </PageTransition>
  );
}
