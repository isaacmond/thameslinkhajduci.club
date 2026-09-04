"use client";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export const inputClass = "control focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-ash/60";

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("inline-flex cursor-pointer select-none items-center gap-2.5 text-xs text-ash", className)}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={clsx("relative h-6 w-11 shrink-0 rounded-full border outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06140c]", checked ? "border-mint bg-mint" : "border-white/15 bg-white/10")}>
        <span aria-hidden className={clsx("absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-200", checked ? "translate-x-5 bg-night" : "translate-x-0 bg-cream")} />
      </button>
      <span>{label}</span>
    </label>
  );
}

export function Select({ value, onChange, options, label, disabled, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; disabled?: boolean; className?: string }) {
  return (
    <label className={clsx("flex flex-col gap-1 text-xs text-ash", disabled && "opacity-40", className)}>
      <span className="eyebrow">{label}</span>
      <span className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="control focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream">
          {options.map((o) => <option key={o.value} value={o.value} className="bg-pine">{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ash" aria-hidden />
      </span>
    </label>
  );
}
