"use client";
import { usePath } from "./use-path";

/** The home page renders the full sponsors block itself, so the footer skips its compact copy there. */
export function HideOnHome({ children }: { children: React.ReactNode }) {
  const path = usePath();
  if (path === "/") return null;
  return <>{children}</>;
}
