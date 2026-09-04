"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="card-solid pitch mx-auto max-w-2xl px-6 py-14 text-center animate-rise">
      <p className="eyebrow">Signalling failure</p>
      <h1 className="display mt-2 text-5xl text-cream sm:text-6xl">Severe delays</h1>
      <p className="mx-auto mt-3 max-w-md text-ash">Something went wrong loading the club&apos;s data. This is usually temporary, occasionally us.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ash/60">ref {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="focus-ring rounded-lg bg-mint px-4 py-2.5 font-semibold text-night hover:bg-mint-soft">Try again</button>
        <Link href="/" className="focus-ring rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10">Home</Link>
      </div>
    </div>
  );
}
