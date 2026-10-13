import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { getData } from "@/lib/data";
import { chronological, fmtDate, headToHead, signed } from "@/lib/stats";
import { PageHeader, SectionTitle, Stat, Tag } from "@/components/ui";
import { TeamBadge, opponentVerdict } from "@/components/team-badge";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Opponents", description: "Thameslink Hajduci's head-to-head record against every team they have played." };

const gdTone = (gd: number) => (gd > 0 ? "text-win" : gd < 0 ? "text-loss" : "text-ink");

export default async function OpponentsPage() {
  const data = await getData();
  const opps = headToHead(data.matches);
  const rows = opps.map((o, i) => { const ms = chronological(o.matches); return { o, rank: i + 1, gd: o.gf - o.ga, last: ms[ms.length - 1]?.date ?? null, v: opponentVerdict(o) }; });
  const beaten = opps.filter((o) => o.won > 0).length;
  const bogey = opps.filter((o) => o.played >= 5 && o.won === 0).length;
  const unbeaten = opps.filter((o) => o.played >= 3 && o.lost === 0).length;
  const neverBeaten = opps.filter((o) => o.won === 0).length;

  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Head to head" title="Opponents" sub="Every team the club has played in the league, most frequent first." />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Opponents summary">
        <Stat label="Opponents" value={opps.length} sub="in the league" />
        <Stat label="Beaten" value={beaten} sub={`${neverBeaten} not yet`} />
        <Stat label="Yet to beat" value={bogey} sub="after five or more meetings" />
        <Stat label="Unbeaten against" value={unbeaten} sub="after three or more meetings" />
      </section>

      <section>
        <SectionTitle>Every opponent</SectionTitle>

        {/* Phones: one card per team. */}
        <ul className="stagger grid grid-cols-1 gap-2 sm:hidden">
          {rows.map(({ o, rank, last, v }) => (
            <li key={o.key}>
              <Link href={`/opponents/${o.slug}`} className="card card-link focus-ring flex items-center gap-3 p-3.5">
                <TeamBadge name={o.opponent} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="tabular w-5 shrink-0 text-xs font-semibold text-muted">{rank}</span>
                    <span className="min-w-0 truncate font-semibold leading-tight text-ink" title={o.opponent}>{o.opponent}</span>
                    {v && <Tag tone={v.tone} size="sm" className="ml-auto shrink-0">{v.word}</Tag>}
                  </div>
                  <p className="tabular mt-1 text-xs text-muted">Played {o.played} · won {o.won}, drew {o.drawn}, lost {o.lost}</p>
                  <p className="mt-0.5 text-2xs text-muted">{o.seasons.join(" ")} · <span className="whitespace-nowrap">last played {fmtDate(last)}</span></p>
                </div>
                <span className="display shrink-0 text-2xl leading-none text-ink" aria-label={`Goals for ${o.gf}, against ${o.ga}`}>{o.gf}–{o.ga}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Bigger screens: the table. */}
        <div className="card hidden overflow-hidden sm:block">
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full">
              <thead>
                <tr><th>Opponent</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">Goals</th><th className="num">GD</th><th className="hidden lg:table-cell">Seasons</th><th className="hidden lg:table-cell">Last played</th><th><span className="sr-only">Note</span></th></tr>
              </thead>
              <tbody>
                {rows.map(({ o, rank, gd, last, v }) => (
                  <tr key={o.key}>
                    <td className="h-14">
                      <div className="flex items-center gap-3">
                        <span className="tabular w-5 shrink-0 text-xs font-semibold text-muted">{rank}</span>
                        <TeamBadge name={o.opponent} size={32} />
                        <Link href={`/opponents/${o.slug}`} className="link max-w-[11rem] truncate font-medium text-ink xl:max-w-[16rem]" title={o.opponent}>{o.opponent}</Link>
                      </div>
                    </td>
                    <td className="num">{o.played}</td>
                    <td className="num">{o.won}</td>
                    <td className="num">{o.drawn}</td>
                    <td className="num">{o.lost}</td>
                    <td className="num">{o.gf}–{o.ga}</td>
                    <td className={clsx("num font-semibold", gdTone(gd))}>{signed(gd)}</td>
                    <td className="hidden whitespace-normal max-w-[9rem] text-xs leading-relaxed text-muted lg:table-cell">{o.seasons.join(" ")}</td>
                    <td className="hidden text-muted lg:table-cell">{fmtDate(last)}</td>
                    <td>{v && <Tag tone={v.tone} size="sm">{v.word}</Tag>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
