"use client";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `value` when scrolled into view. Renders the final value on the server so nothing shifts without JS. */
export function CountUp({ value, duration = 900, format = (n: number) => String(Math.round(n)), className }: { value: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown(value * eased);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      setShown(0);
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className={className}>{format(shown)}</span>;
}
