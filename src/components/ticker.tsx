import Link from "next/link";
import clsx from "clsx";
import { getData } from "@/lib/data";
import { currentStreak, fmtDate, fmtMoney, lastResult, leaderboard, nextFixture, scoreline } from "@/lib/stats";
import { serviceStatus } from "@/lib/captions";

type Item = { text: string; href?: string; tone?: "ok" | "late" | "bad" | "muted" };
const toneClass = { ok: "text-mint-soft", late: "text-gold", bad: "text-[#ff9a9d]", muted: "text-cream/80" } as const;

/** A single-line service-update marquee under the header. Server-rendered from live data; pauses on hover; honours reduced motion via the global rule. */
export async function ServiceTicker() {
  const items: Item[] = [];
  try {
    const d = await getData();
    const next = nextFixture(d), last = lastResult(d), streak = currentStreak(d.matches);
    const boot = leaderboard(d.players, "goals")[0], ticket = leaderboard(d.players, "apps")[0];
    const owed = d.money.rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
    if (next) items.push({ text: `Next departure: ${next.opponent} · ${fmtDate(next.date, { weekday: "short", day: "numeric", month: "short" })} ${next.kickOff ?? ""}`, href: `/matches/${next.id}`, tone: "late" });
    if (last) { const s = serviceStatus(last.result); items.push({ text: `Last service: ${scoreline(last)} vs ${last.opponent} · ${s.word}`, href: `/matches/${last.id}`, tone: s.tone }); }
    if (streak) items.push({ text: streak.type === "L" ? `Severe delays: ${streak.length} defeat${streak.length > 1 ? "s" : ""} running` : streak.type === "W" ? `Good service: ${streak.length} win${streak.length > 1 ? "s" : ""} running` : "Minor delays: drew last time out", href: "/records", tone: streak.type === "L" ? "bad" : streak.type === "W" ? "ok" : "late" });
    if (boot) items.push({ text: `Golden boot: ${boot.player.name} (${boot.value})`, href: `/squad/${boot.player.slug}`, tone: "ok" });
    if (ticket) items.push({ text: `Season ticket holder: ${ticket.player.name} (${ticket.value} apps)`, href: `/squad/${ticket.player.slug}`, tone: "muted" });
    items.push({ text: `${d.allTime.goalsAgainst} goals conceded all-time, and counting`, href: "/records", tone: "bad" });
    if (owed > 0.01) items.push({ text: `Treasury: ${fmtMoney(owed)} outstanding`, href: "/money", tone: "late" });
    items.push({ text: "Good service on all other lines", tone: "ok" });
  } catch { return null; }
  if (!items.length) return null;
  const strip = (hidden: boolean) => (
    <span aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span className="mx-5 text-ash/40" aria-hidden>◆</span>
          {it.href ? <Link href={it.href} tabIndex={hidden ? -1 : undefined} className={clsx("focus-ring rounded hover:underline", toneClass[it.tone ?? "muted"])}>{it.text}</Link> : <span className={toneClass[it.tone ?? "muted"]}>{it.text}</span>}
        </span>
      ))}
    </span>
  );
  return (
    <div aria-label="Service updates" className="overflow-hidden border-b border-white/10 bg-[#07130b] py-1.5 font-mono text-[11px] uppercase tracking-wider">
      <div className="marquee board-glow">{strip(false)}{strip(true)}</div>
    </div>
  );
}
