"use client";
import Link from "next/link";
import { useEffect } from "react";
import { btn } from "@/components/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-xl py-16 text-center animate-rise">
      <p className="eyebrow">Error</p>
      <h1 className="display mt-3 text-5xl leading-none text-ink sm:text-6xl">Something went wrong</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">The club&apos;s records couldn&apos;t be loaded. This is usually temporary.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted/70">Reference {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={btn("primary")}>Try again</button>
        <Link href="/" className={btn("secondary")}>Home</Link>
      </div>
    </div>
  );
}
