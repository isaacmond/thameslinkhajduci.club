import Image from "next/image";
import Link from "next/link";
import { HideOnHome } from "./hide-on-home";

export const SPONSORS = [
  { name: "Transport for London", src: "/sponsors/tfl.svg", tagline: "Official travel partner", url: "https://tfl.gov.uk" },
  { name: "Thameslink", src: "/sponsors/thameslink.svg", tagline: "Official rail partner", url: "https://www.thameslinkrailway.com" },
  { name: "Lime", src: "/sponsors/lime.svg", tagline: "Official e-bike partner", url: "https://www.li.me" },
  { name: "Deliciously Ella", src: "/sponsors/ella.svg", tagline: "Official nutrition partner", url: "https://deliciouslyella.com" },
];
/** A stable match sponsor per fixture. */
export const sponsorFor = (key: string) => SPONSORS[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SPONSORS.length];

/** Full-colour partner tiles, used on the home page. */
export function Sponsors() {
  return (
    <section aria-labelledby="sponsors-heading">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow">Our partners</p>
          <h2 id="sponsors-heading" className="display text-[1.75rem] leading-tight text-ink">Proudly supported by</h2>
        </div>
        <p className="text-sm text-muted">With thanks to our partners</p>
      </div>
      <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SPONSORS.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="focus-ring group flex h-full flex-col rounded-[var(--radius-xl)] border border-ink/10 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg">
              <div className="relative flex h-14 w-full items-center justify-center">
                <Image src={s.src} alt={`${s.name} logo`} fill sizes="200px" className="object-contain" />
              </div>
              <p className="mt-auto pt-4 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{s.name}</p>
              <p className="text-center text-[11px] text-neutral-500">{s.tagline}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One-line version for every other page: colour logos on small white tiles. */
function SponsorStrip() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="eyebrow">Proudly supported by</p>
      <ul className="flex flex-wrap items-center gap-3">
        {SPONSORS.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" title={`${s.name} · ${s.tagline}`} className="focus-ring flex h-10 items-center rounded-lg border border-ink/10 bg-white px-3 transition-shadow hover:shadow-md">
              <Image src={s.src} alt={s.name} width={96} height={28} style={{ width: "auto", height: 22 }} className="max-w-[104px] object-contain" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <HideOnHome><SponsorStrip /><div className="my-8 border-t border-ink/10" aria-hidden /></HideOnHome>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/crest.png" alt="" width={44} height={44} className="h-11 w-11" />
            <div>
              <p className="display text-2xl leading-none text-ink">Thameslink Hajduci</p>
              <p className="mt-1 text-sm text-muted"><span lang="sr-Cyrl">Темзлинк Хайдуки</span> · Whitechapel, London · Since 2024</p>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link className="text-muted transition-colors hover:text-ink" href="/records">Records</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/compare">Compare players</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/data">Data &amp; API</Link>
            <a className="text-muted transition-colors hover:text-ink" href="https://github.com/isaacmond/thameslinkhajduci.club" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
