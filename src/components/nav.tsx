"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { CalendarDays, ClipboardPen, Coins, Database, Medal, Menu, Shield, Swords, Target, TrainFront, Trophy, UserRound, Users, X } from "lucide-react";
import { usePath } from "./use-path";
import { AccountChip } from "./account-chip";

const LINKS = [
  { href: "/", label: "Home" }, { href: "/squad", label: "Squad" }, { href: "/matches", label: "Matches" }, { href: "/seasons", label: "Seasons" },
  { href: "/stats", label: "Stats" }, { href: "/opponents", label: "Opponents" }, { href: "/records", label: "Records" }, { href: "/money", label: "Money" }, { href: "/submit", label: "Submit" },
];
const TABS = [{ href: "/", label: "Home", Icon: TrainFront }, { href: "/matches", label: "Matches", Icon: CalendarDays }, { href: "/squad", label: "Squad", Icon: Users }, { href: "/stats", label: "Stats", Icon: Target }];
const MORE = [{ href: "/submit", label: "Submit a score", Icon: ClipboardPen }, { href: "/seasons", label: "Seasons", Icon: Trophy }, { href: "/opponents", label: "Opponents", Icon: Shield }, { href: "/compare", label: "Compare players", Icon: Swords }, { href: "/records", label: "Records", Icon: Medal }, { href: "/money", label: "Money", Icon: Coins }, { href: "/data", label: "Data & API", Icon: Database }];
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Nav({ authEnabled = false }: { authEnabled?: boolean }) {
  const path = usePath();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="focus-ring flex shrink-0 items-center gap-3 rounded-lg py-3">
          <Image src="/crest.png" alt="Thameslink Hajduci crest" width={44} height={44} priority className="h-10 w-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:h-11 sm:w-11" />
          <div className="leading-none">
            <div className="display text-xl tracking-wide text-cream sm:text-2xl">Thameslink Hajduci</div>
            <div className="eyebrow mt-0.5 hidden sm:block"><span lang="sr-Cyrl">Темзлинк Хайдуки</span> · est. 2024</div>
          </div>
        </Link>
        <nav aria-label="Primary" className="-mb-px ml-auto hidden gap-0.5 md:flex lg:gap-1">
          {LINKS.map((l) => {
            const active = isActive(path, l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={clsx("focus-ring relative whitespace-nowrap rounded-md px-2.5 py-4 text-sm font-medium transition-colors lg:px-3", active ? "text-cream" : "text-ash hover:text-cream")}>
                {l.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" />}
              </Link>
            );
          })}
        </nav>
        {authEnabled && <AccountChip className="hidden md:inline-flex" />}
        <span className="ml-auto text-[11px] uppercase tracking-widest text-ash md:hidden" aria-hidden>{LINKS.find((l) => isActive(path, l.href))?.label ?? ""}</span>
        {authEnabled && <AccountChip className="md:hidden" />}
      </div>
    </header>
  );
}

/** Bottom tab bar for phones. Everything reachable in one thumb-tap; the four lesser-used pages sit behind "More". */
export function MobileTabs({ authEnabled = false }: { authEnabled?: boolean }) {
  const path = usePath();
  const more = authEnabled ? [...MORE, { href: "/account", label: "Your account", Icon: UserRound }] : MORE;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const moreActive = more.some((m) => isActive(path, m.href));
  const tab = "focus-ring flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";
  return (
    <>
      {open && <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-night/70 backdrop-blur-sm md:hidden" />}
      {open && (
        <div role="dialog" aria-label="More pages" className="fixed inset-x-3 bottom-[calc(3.5rem+0.75rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-white/10 bg-pine p-2 shadow-card animate-rise md:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {more.map((m) => (
              <li key={m.href}><Link href={m.href} onClick={() => setOpen(false)} aria-current={isActive(path, m.href) ? "page" : undefined} className={clsx("focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", isActive(path, m.href) ? "bg-mint/15 text-mint-soft" : "text-cream hover:bg-white/5")}><m.Icon size={18} aria-hidden />{m.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
      <nav aria-label="Primary (mobile)" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-night/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {TABS.map((t) => { const active = isActive(path, t.href); return <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={clsx(tab, active ? "text-mint-soft" : "text-ash")}><t.Icon size={20} aria-hidden />{t.label}</Link>; })}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={clsx(tab, open || moreActive ? "text-mint-soft" : "text-ash")}>{open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}More</button>
      </nav>
    </>
  );
}
