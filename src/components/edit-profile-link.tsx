"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getMe } from "./me-client";

/** On a player's page: a link to the account page, shown only to that player when signed in. */
export function EditProfileLink({ player }: { player: string }) {
  const [mine, setMine] = useState(false);
  useEffect(() => { let on = true; getMe().then((m) => { if (on) setMine(m?.player === player); }); return () => { on = false; }; }, [player]);
  if (!mine) return null;
  return <Link href="/account" className="chip focus-ring text-mint-soft hover:bg-white/10"><Pencil size={12} aria-hidden />Edit your profile</Link>;
}
