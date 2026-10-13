"use client";
import { useState } from "react";
import clsx from "clsx";
import { chipToggle, fieldClass, hintClass } from "./controls";

/** The four positions, in one vocabulary site-wide. */
export const POSITIONS = [["GK", "Goalkeeper"], ["DEF", "Defender"], ["MID", "Midfielder"], ["FWD", "Forward"]] as const;

/**
 * Position chips around hidden checkboxes named `positions`, so a form posts them as they are. Controlled when `value`
 * and `onChange` are given, otherwise it starts from `defaultValue` and keeps its own state.
 */
export function PositionPicker({ value, onChange, defaultValue = [], label = "Positions", hint, className }: { value?: string[]; onChange?: (v: string[]) => void; defaultValue?: string[]; label?: string; hint?: React.ReactNode; className?: string }) {
  const [own, setOwn] = useState<string[]>(defaultValue);
  const selected = value ?? own;
  const toggle = (code: string) => {
    const next = selected.includes(code) ? selected.filter((x) => x !== code) : [...selected, code];
    if (value === undefined) setOwn(next);
    onChange?.(next);
  };
  return (
    <fieldset className={clsx(fieldClass, className)}>
      <legend className="eyebrow mb-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {POSITIONS.map(([code, name]) => {
          const on = selected.includes(code);
          return (
            <label key={code} className={clsx(chipToggle(on, "control"), "focus-within:ring-2 focus-within:ring-accent/60")}>
              <input type="checkbox" name="positions" value={code} checked={on} onChange={() => toggle(code)} className="sr-only" />
              {code} <span className="font-normal">{name}</span>
            </label>
          );
        })}
      </div>
      {hint && <span className={hintClass}>{hint}</span>}
    </fieldset>
  );
}
