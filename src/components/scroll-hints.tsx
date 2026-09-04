"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Marks .scroll-x containers that actually overflow with .can-scroll, so the edge fade only appears when there is something to scroll to. */
export function ScrollHints() {
  const path = usePathname();
  useEffect(() => {
    const update = () => { for (const el of document.querySelectorAll<HTMLElement>(".scroll-x")) { const s = el.scrollWidth > el.clientWidth + 2; el.classList.toggle("can-scroll", s); el.classList.toggle("at-end", s && el.scrollLeft + el.clientWidth >= el.scrollWidth - 2); } };
    const t = setTimeout(update, 50);
    const ro = new ResizeObserver(update); document.querySelectorAll(".scroll-x").forEach((el) => ro.observe(el));
    const onScroll = (e: Event) => { const el = e.target as HTMLElement; if (el.classList?.contains("scroll-x")) el.classList.toggle("at-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 2); };
    document.addEventListener("scroll", onScroll, true); window.addEventListener("resize", update);
    return () => { clearTimeout(t); ro.disconnect(); document.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", update); };
  }, [path]);
  return null;
}
