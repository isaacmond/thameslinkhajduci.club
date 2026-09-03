import { ViewTransition } from "react";

/** Soft cross-fade/slide between routes. Wrap the root of each page (layouts persist, so the wrapper must live in the page). Browsers without the View Transitions API just swap instantly. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition enter="page-in" exit="page-out" default="none">{children}</ViewTransition>;
}
