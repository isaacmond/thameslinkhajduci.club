import clsx from "clsx";

/**
 * The one button. Filled crest green for the action the page is for, an outline for everything else, ghost for "never mind",
 * gold for the admin's door. Sizes share the control height (2.375rem) so a button sits level with an input or select
 * in the same row; `md` is the tall form submit, `icon` a square for a lone icon. Plain functions, so server and client components alike can use them.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "gold";
export type ButtonSize = "xs" | "sm" | "md" | "icon";
const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-paper hover:opacity-90",
  secondary: "border-ink/15 bg-surface text-ink hover:border-ink/30",
  ghost: "border-transparent text-muted hover:text-ink",
  gold: "border-gold/35 text-gold hover:bg-gold/10",
};
const SIZE: Record<ButtonSize, string> = { xs: "h-8 px-3 text-sm", sm: "h-[2.375rem] px-4 text-sm", md: "h-12 px-5 text-base", icon: "h-[2.375rem] w-[2.375rem] px-0 text-sm" };

export const btn = (variant: ButtonVariant = "secondary", size: ButtonSize = "sm", className?: string) =>
  clsx("focus-ring inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:opacity-60", VARIANT[variant], SIZE[size], className);
