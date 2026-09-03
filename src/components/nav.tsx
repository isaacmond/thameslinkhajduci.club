"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/matches", label: "Matches" },
  { href: "/seasons", label: "Seasons" },
  { href: "/stats", label: "Stats" },
  { href: "/records", label: "Records" },
  { href: "/money", label: "Money" },
  { href: "/data", label: "Data" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 py-3 focus-ring rounded-lg">
          <Image src="/crest.png" alt="Thameslink Hajduci crest" width={44} height={44} priority className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
          <div className="leading-none">
            <div className="display text-2xl tracking-wide text-cream">Thameslink Hajduci</div>
            <div className="eyebrow mt-0.5 hidden sm:block">Темзлинк Хайдуки · est. 2024</div>
          </div>
        </Link>
        <nav aria-label="Primary" className="scrollbar-none nav-fade -mb-px ml-auto flex gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={clsx("focus-ring relative whitespace-nowrap rounded-md px-3 py-4 text-sm font-medium transition-colors", active ? "text-cream" : "text-ash hover:text-cream")}>
                {l.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
