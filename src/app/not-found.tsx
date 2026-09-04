import Link from "next/link";
import { Crest } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="card-solid pitch mx-auto max-w-2xl px-6 py-14 text-center animate-rise">
      <Crest size={96} className="mx-auto" />
      <p className="eyebrow mt-6">404 · Service update</p>
      <h1 className="display mt-2 text-5xl leading-none text-cream sm:text-6xl">This page has been cancelled</h1>
      <p className="mx-auto mt-3 max-w-md text-ash">We apologise for the inconvenience this may cause to your journey. A replacement bus service is operating from the home page.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="focus-ring rounded-lg bg-mint px-4 py-2.5 font-semibold text-night hover:bg-mint-soft">Home</Link>
        <Link href="/matches" className="focus-ring rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10">Matches</Link>
        <Link href="/squad" className="focus-ring rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10">Squad</Link>
      </div>
    </div>
  );
}
