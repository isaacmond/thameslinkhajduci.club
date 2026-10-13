"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { BarChart3, CalendarDays, ClipboardPen, Coins, Database, House, Medal, Menu, Shield, Swords, Trophy, UserRound, Users, X } from "lucide-react";
import { usePath } from "./use-path";
import { AccountChip } from "./account-chip";

const LINKS = [
  { href: "/", label: "Home" }, { href: "/squad", label: "Squad" }, { href: "/matches", label: "Matches" }, { href: "/seasons", label: "Seasons" },
  { href: "/stats", label: "Stats" }, { href: "/opponents", label: "Opponents" }, { href: "/records", label: "Records" }, { href: "/money", label: "Money" }, { href: "/submit", label: "Add result" },
];
const TABS = [{ href: "/", label: "Home", Icon: House }, { href: "/matches", label: "Matches", Icon: CalendarDays }, { href: "/squad", label: "Squad", Icon: Users }, { href: "/stats", label: "Stats", Icon: BarChart3 }];
const MORE = [{ href: "/submit", label: "Add a result", Icon: ClipboardPen }, { href: "/seasons", label: "Seasons", Icon: Trophy }, { href: "/opponents", label: "Opponents", Icon: Shield }, { href: "/compare", label: "Compare players", Icon: Swords }, { href: "/records", label: "Records", Icon: Medal }, { href: "/money", label: "Money", Icon: Coins }, { href: "/data", label: "Data & API", Icon: Database }];
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Nav({ authEnabled = false }: { authEnabled?: boolean }) {
  const path = usePath();
  return (
    <header className="vt-header sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="focus-ring flex shrink-0 items-center gap-3 rounded-lg py-3">
          <Image src="/crest.png" alt="Thameslink Hajduci crest" width={44} height={44} priority className="h-9 w-9 sm:h-10 sm:w-10" />
          <div className="leading-none">
            <div className="display text-[1.4rem] text-ink sm:text-[1.6rem]">Thameslink Hajduci</div>
            <div className="eyebrow mt-0.5 hidden !text-[10px] sm:block">Football club · Est. 2024</div>
          </div>
        </Link>
        <nav aria-label="Primary" className="-mb-px ml-auto hidden gap-0.5 self-stretch md:flex lg:gap-1">
          {LINKS.map((l) => {
            const active = isActive(path, l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={clsx("focus-ring relative inline-flex items-center whitespace-nowrap rounded-md px-2 py-4 text-[13px] font-medium transition-colors lg:px-2.5", active ? "text-ink" : "text-muted hover:text-ink")}>
                {l.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-px bg-ink" />}
              </Link>
            );
          })}
        </nav>
        {authEnabled && <span className="hidden md:flex"><AccountChip /></span>}
        <span className="eyebrow ml-auto md:hidden" aria-hidden>{LINKS.find((l) => isActive(path, l.href))?.label ?? ""}</span>
        {authEnabled && <span className="flex md:hidden"><AccountChip /></span>}
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
      {open && <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] md:hidden" />}
      {open && (
        <div role="dialog" aria-label="More pages" className="fixed inset-x-3 bottom-[calc(3.5rem+0.75rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-ink/10 bg-surface p-2 shadow-card animate-rise md:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {more.map((m) => (
              <li key={m.href}><Link href={m.href} onClick={() => setOpen(false)} aria-current={isActive(path, m.href) ? "page" : undefined} className={clsx("focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", isActive(path, m.href) ? "bg-accent/10 text-accent" : "text-ink hover:bg-ink/5")}><m.Icon size={18} aria-hidden />{m.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
      <nav aria-label="Primary (mobile)" className="vt-tabs fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-ink/10 bg-paper/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {TABS.map((t) => { const active = isActive(path, t.href); return <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={clsx(tab, active ? "text-accent" : "text-muted")}><t.Icon size={20} strokeWidth={1.75} aria-hidden />{t.label}</Link>; })}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={clsx(tab, open || moreActive ? "text-accent" : "text-muted")}>{open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}More</button>
      </nav>
    </>
  );
}
