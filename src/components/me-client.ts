"use client";
import { whoAmI, type Me } from "@/app/actions/auth";

/** One "who am I" round trip per page load, shared by every client component that wants it. */
let cached: Promise<Me | null> | null = null;
export function getMe(): Promise<Me | null> {
  cached ??= whoAmI().catch(() => null);
  return cached;
}
