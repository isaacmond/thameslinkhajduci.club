"use client";
import { usePathname } from "next/navigation";

/** usePathname, normalised. During ISR regeneration on Vercel the root route can report "/index", which made the server and client disagree about which nav item is active. */
export function usePath(): string {
  const p = usePathname() ?? "/";
  return p === "/index" ? "/" : p.replace(/\/index$/, "") || "/";
}
