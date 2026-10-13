"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getMe } from "./me-client";
import { btn, type ButtonSize, type ButtonVariant } from "./button";

/** On a player's page: a link to the account page, shown only to that player when signed in. */
export function EditProfileLink({ player, variant = "secondary", size = "xs" }: { player: string; variant?: ButtonVariant; size?: ButtonSize }) {
  const [mine, setMine] = useState(false);
  useEffect(() => { let on = true; getMe().then((m) => { if (on) setMine(m?.player === player); }); return () => { on = false; }; }, [player]);
  if (!mine) return null;
  return <Link href="/account" className={btn(variant, size)}><Pencil size={14} aria-hidden />Edit your profile</Link>;
}
