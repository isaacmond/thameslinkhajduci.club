"use client";
import clsx from "clsx";
import { Check, ChevronDown, CircleAlert } from "lucide-react";

/**
 * A filter chip or toggle that shows whether it is selected, in the one site-wide scheme (accent tint when on, surface when off).
 * `control` makes it as tall as an input, for chips that sit in a form row beside inputs and selects.
 */
export const chipToggle = (active: boolean, size: "chip" | "control" = "chip") => clsx("focus-ring chip chip-tap cursor-pointer whitespace-nowrap transition-colors", size === "control" && "h-control px-3", active ? "chip-on" : "chip-off");

/** The one form field layout: eyebrow label, the control, then a hint line. Every label, control and hint in a form row lines up. */
export const fieldClass = "flex min-w-0 flex-col gap-1 text-xs text-muted";
/** The hint line under a control. It keeps its height when empty, so fields side by side stay level. */
export const hintClass = "min-h-5 text-2xs text-muted";

export function Field({ label, hint, error = false, reserveHint = false, as: As = "label", className, children }: { label: React.ReactNode; hint?: React.ReactNode; error?: boolean; reserveHint?: boolean; as?: "label" | "div"; className?: string; children: React.ReactNode }) {
  return (
    <As className={clsx(fieldClass, className)}>
      <span className="eyebrow">{label}</span>
      {children}
      {(hint || reserveHint) && <span className={error ? "min-h-5 text-2xs text-loss" : hintClass}>{hint}</span>}
    </As>
  );
}

/** The one style for a form's status or validation line: accent with a tick when it went through, loss with an alert otherwise. */
export function FormStatus({ tone, children, role = "status", className }: { tone: "ok" | "error"; children: React.ReactNode; role?: "status" | "alert"; className?: string }) {
  return (
    <p role={role} className={clsx("flex items-center gap-1.5 text-sm", tone === "ok" ? "text-accent" : "text-loss", className)}>
      {tone === "ok" ? <Check size={14} className="shrink-0" aria-hidden /> : <CircleAlert size={14} className="shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

export const inputClass = "control focus-ring w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted";

/** A two-state switch. Given a `name`, it posts "on" or an empty value with its form, so server actions read it like a checkbox. */
export function Switch({ checked, onChange, label, name, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; name?: string; className?: string }) {
  return (
    <label className={clsx("inline-flex cursor-pointer select-none items-center gap-2.5 text-xs text-muted", className)}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={clsx("relative h-6 w-11 shrink-0 rounded-full border outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper", checked ? "border-accent bg-accent" : "border-ink/15 bg-ink/10")}>
        <span aria-hidden className={clsx("absolute left-0.5 top-0.5 size-4.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-200", checked ? "translate-x-5 bg-paper" : "translate-x-0 bg-surface")} />
      </button>
      <span>{label}</span>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </label>
  );
}

/** A labelled select with the site's chevron. Controlled with `value` and `onChange`, or uncontrolled with `name` and `defaultValue` inside a form. */
export function Select({ value, defaultValue, onChange, name, options, label, hint, reserveHint, disabled, className }: { value?: string; defaultValue?: string; onChange?: (v: string) => void; name?: string; options: { value: string; label: string }[]; label: string; hint?: React.ReactNode; reserveHint?: boolean; disabled?: boolean; className?: string }) {
  return (
    <Field label={label} hint={hint} reserveHint={reserveHint} className={clsx(disabled && "opacity-40", className)}>
      <span className="relative">
        <select name={name} {...(value !== undefined ? { value } : { defaultValue })} onChange={onChange && ((e) => onChange(e.target.value))} disabled={disabled} className="control focus-ring w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      </span>
    </Field>
  );
}
