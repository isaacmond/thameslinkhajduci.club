import clsx from "clsx";

/** A neat one-line record of what was just submitted: a small label, the headline, and a line of detail. */
export function SummaryCard({ label, title, detail, className }: { label: string; title: string; detail?: string; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-ink/10 bg-surface px-4 py-3.5", className)}>
      <p className="eyebrow eyebrow-sm">{label}</p>
      <p className="display mt-1 text-2xl leading-tight text-ink">{title}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}
