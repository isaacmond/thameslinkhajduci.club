import Image from "next/image";
import Link from "next/link";

/** The club's friends, thanked quietly at the foot of every page. */
export const SPONSORS = [
  { name: "Transport for London", src: "/sponsors/tfl.svg", url: "https://tfl.gov.uk" },
  { name: "Thameslink", src: "/sponsors/thameslink.svg", url: "https://www.thameslinkrailway.com" },
  { name: "Lime", src: "/sponsors/lime.svg", url: "https://www.li.me" },
  { name: "Deliciously Ella", src: "/sponsors/ella.svg", url: "https://deliciouslyella.com" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/crest.png" alt="" width={44} height={44} className="h-11 w-11" />
            <div>
              <p className="display text-2xl leading-none text-ink">Thameslink Hajduci</p>
              <p className="mt-1 text-sm text-muted"><span lang="sr-Cyrl">Темзлинк Хайдуки</span> · Six-a-side, East London, since 2024</p>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link className="text-muted transition-colors hover:text-ink" href="/records">Records</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/compare">Compare players</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/data">Data</Link>
            <a className="text-muted transition-colors hover:text-ink" href="https://github.com/isaacmond/thameslinkhajduci.club" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="eyebrow !text-[10px]">With thanks to</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {SPONSORS.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.name} className="focus-ring flex h-8 items-center rounded opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0">
                  <Image src={s.src} alt={s.name} width={96} height={24} style={{ width: "auto", height: 18 }} className="max-w-[96px] object-contain dark:invert" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
