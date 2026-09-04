import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Sign-in did not finish", robots: { index: false, follow: false } };

export default function SignInTrouble() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader eyebrow="Members" title="That sign-in did not finish" sub="The link was stale or the attempt timed out. It happens; start again and it takes a few seconds." />
      <div className="flex flex-wrap gap-3">
        <a href="/sign-in" className="focus-ring inline-flex items-center rounded-lg bg-mint px-5 py-3 font-semibold text-night hover:bg-mint-soft">Try again</a>
        <Link href="/" className="focus-ring inline-flex items-center rounded-lg border border-white/15 px-5 py-3 font-semibold text-cream hover:bg-white/10">Back to the site</Link>
      </div>
    </div>
    </PageTransition>
  );
}
