import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/ui";
import { btn } from "@/components/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center animate-rise">
      <Crest size={88} className="mx-auto h-20 w-20" />
      <p className="eyebrow mt-8">Page not found</p>
      <h1 className="display mt-3 text-5xl leading-none text-ink sm:text-6xl">Nothing here</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">The page you were looking for doesn&apos;t exist, or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={btn("primary")}>Home</Link>
        <Link href="/matches" className={btn("secondary")}>Matches</Link>
        <Link href="/squad" className={btn("secondary")}>Squad</Link>
      </div>
    </div>
  );
}
