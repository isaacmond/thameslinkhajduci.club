import Image from "next/image";
import Link from "next/link";
import { HideOnHome } from "./hide-on-home";

export const SPONSORS = [
  { name: "Transport for London", src: "/sponsors/tfl.svg", tagline: "Official travel partner", url: "https://tfl.gov.uk" },
  { name: "Thameslink", src: "/sponsors/thameslink.svg", tagline: "Official rail partner", url: "https://www.thameslinkrailway.com" },
  { name: "Lime", src: "/sponsors/lime.svg", tagline: "Official e-bike partner", url: "https://www.li.me" },
  { name: "Deliciously Ella", src: "/sponsors/ella.svg", tagline: "Official nutrition partner", url: "https://deliciouslyella.com" },
];
/** Deterministic "match sponsor" so every fixture page gets its own joke. */
export const sponsorFor = (key: string) => SPONSORS[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SPONSORS.length];

/** Full-colour partner tiles, used on the home page. */
export function Sponsors() {
  return (
    <section aria-labelledby="sponsors-heading" className="card p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Our partners</p>
          <h2 id="sponsors-heading" className="display text-3xl text-cream">Proudly supported by</h2>
        </div>
        <p className="text-xs text-ash">Thank you for keeping us moving</p>
      </div>
      <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SPONSORS.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="focus-ring group flex h-full flex-col rounded-xl bg-white p-4 transition-transform hover:-translate-y-0.5">
              <div className="relative mx-auto flex h-14 items-center justify-center">
                <Image src={s.src} alt={`${s.name} logo`} fill sizes="200px" className="object-contain" loading="eager" />
              </div>
              <p className="mt-auto pt-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{s.name}</p>
              <p className="text-center text-[11px] text-neutral-500">{s.tagline}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Quiet one-line version for every other page: monochrome logos that brighten on hover, no layout shift. */
function SponsorStrip() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="eyebrow">Proudly supported by</p>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {SPONSORS.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.tagline} className="focus-ring group flex items-center rounded">
              <Image src={s.src} alt={s.name} width={96} height={28} style={{ width: "auto", height: 24 }} className="max-w-[96px] object-contain opacity-55 grayscale invert transition-opacity duration-300 group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HideOnHome><SponsorStrip /><div className="mb-6 mt-6 border-t border-white/10" aria-hidden /></HideOnHome>
        <div className="flex flex-col gap-4 text-sm text-ash sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/crest.png" alt="" width={28} height={28} />
            <span className="display text-lg text-cream">Forza Hajduci</span>
            <span className="hidden sm:inline">· Whitechapel, London · Tuesdays, allegedly</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link className="link" href="/data">Data &amp; API</Link>
            <a className="link" href="https://github.com/isaacmond/thameslinkhajduci.club" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
