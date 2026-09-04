import Link from "next/link";
import { BadgeCheck } from "lucide-react";

export type SignedIn = { player: string; direct: boolean };

/** Replaces the "Your name" field for signed-in members: the site already knows who is submitting. */
export function SignedInNote({ signedIn }: { signedIn: SignedIn }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-ash">
      <span className="eyebrow">Submitted by</span>
      <p className="flex min-h-[2.375rem] items-center gap-2 text-sm text-cream"><BadgeCheck size={16} className="text-mint" aria-hidden />{signedIn.player} <span className="text-ash">· signed in</span></p>
      <span className="min-h-[1.25rem] text-[11px] text-ash">{signedIn.direct ? "Written into the records as you." : "The admin sees it came from you."} <Link href="/account" className="link">Account</Link></span>
    </div>
  );
}
