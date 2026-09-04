import Link from "next/link";
import clsx from "clsx";
import { Coins, Goal, UserPlus } from "lucide-react";

export type SubmitKind = "score" | "payment" | "player";
export const SUBMIT_KINDS: { id: SubmitKind; label: string; short: string; icon: typeof Goal }[] = [
  { id: "score", label: "Match result", short: "Result", icon: Goal },
  { id: "payment", label: "Payment", short: "Payment", icon: Coins },
  { id: "player", label: "New player", short: "Player", icon: UserPlus },
];
export const submitHref = (kind: SubmitKind, extra?: Record<string, string>) => { const q = new URLSearchParams({ ...(kind === "score" ? {} : { type: kind }), ...(extra ?? {}) }).toString(); return `/submit${q ? `?${q}` : ""}`; };

export function SubmitTabs({ active }: { active: SubmitKind }) {
  return (
    <nav aria-label="What to submit" className="flex flex-wrap gap-2">
      {SUBMIT_KINDS.map(({ id, label, short, icon: Icon }) => (
        <Link key={id} href={submitHref(id)} scroll={false} aria-current={active === id ? "page" : undefined} className={clsx("focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", active === id ? "border-mint/50 bg-mint/15 text-cream" : "border-white/10 text-ash hover:border-white/25 hover:text-cream")}>
          <Icon size={15} aria-hidden /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{short}</span>
        </Link>
      ))}
    </nav>
  );
}
