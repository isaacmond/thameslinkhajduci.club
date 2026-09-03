"use client";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("inline-flex cursor-pointer items-center gap-2 text-xs text-ash", className)}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={clsx("focus-ring relative h-5 w-9 shrink-0 rounded-full border transition-colors", checked ? "border-mint/60 bg-mint" : "border-white/15 bg-white/10")}>
        <span className={clsx("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-night shadow transition-transform", checked ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
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
