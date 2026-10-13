import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { fieldClass, hintClass } from "./controls";

export type SignedIn = { player: string; direct: boolean };

/** Replaces the "Your name" field for signed-in members: the site already knows who is submitting. */
export function SignedInNote({ signedIn }: { signedIn: SignedIn }) {
  return (
    <div className={fieldClass}>
      <span className="eyebrow">Submitted by</span>
      <p className="flex min-h-control items-center gap-2 text-sm text-ink"><BadgeCheck size={16} className="shrink-0 text-accent" aria-hidden />{signedIn.player} <span className="text-muted">· signed in</span></p>
      <span className={hintClass}>{signedIn.direct ? "Written into the records as you." : "The admin sees it came from you."} <Link href="/account" className="link">Account</Link></span>
    </div>
  );
}
