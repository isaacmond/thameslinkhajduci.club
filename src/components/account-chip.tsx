"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { LogIn, UserRound } from "lucide-react";
import type { Me } from "@/app/actions/auth";
import { Avatar } from "./ui";
import { getMe } from "./me-client";

/** Header sign-in link, or the signed-in member's avatar linking to their account page. Renders nothing until it knows. */
export function AccountChip({ className }: { className?: string }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => { let on = true; getMe().then((m) => { if (on) setMe(m); }); return () => { on = false; }; }, []);
  if (me === undefined) return <span className={clsx("inline-block h-8 w-8", className)} aria-hidden />;
  if (!me) return <a href="/sign-in" className={clsx("focus-ring inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-ash transition-colors hover:text-cream", className)}><LogIn size={16} aria-hidden />Sign in</a>;
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      {me.admin && <Link href="/admin" className="focus-ring hidden rounded-md px-2 py-1 text-sm font-medium text-ash transition-colors hover:text-cream sm:inline">Admin</Link>}
      <Link href="/account" title={`Signed in as ${me.email}`} className="focus-ring inline-flex items-center rounded-full">
        {me.player ? <Avatar name={me.player} photo={me.photo ?? undefined} size={32} /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-ash"><UserRound size={16} aria-hidden /></span>}
        <span className="sr-only">Your account</span>
      </Link>
    </span>
  );
}
