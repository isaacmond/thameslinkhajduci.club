import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";
import { btn } from "@/components/button";

export const metadata: Metadata = { title: "Sign-in did not finish", robots: { index: false, follow: false } };

export default function SignInTrouble() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader eyebrow="Members" title="That sign-in did not finish" sub="The link was stale or the attempt timed out. It happens; start again and it takes a few seconds." />
      <div className="flex flex-wrap gap-3">
        <a href="/sign-in" className={btn("primary", "md")}>Try again</a>
        <Link href="/" className={btn("secondary", "md")}>Back to the site</Link>
      </div>
    </div>
    </PageTransition>
  );
}
