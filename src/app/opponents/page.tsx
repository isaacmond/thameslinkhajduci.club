import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { getData } from "@/lib/data";
import { chronological, fmtDate, headToHead, signed } from "@/lib/stats";
import { PageHeader, SectionTitle, Stat, Tag } from "@/components/ui";
import { Roundel, opponentVerdict } from "@/components/roundel";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Opponents", description: "Head-to-head records against every team Thameslink Hajduci have met in a game that counted. Bogey teams clearly labelled." };

const gdTone = (gd: number) => (gd > 0 ? "text-mint-soft" : gd < 0 ? "text-loss-soft" : "text-cream");

export default async function OpponentsPage() {
  const data = await getData();
  const opps = headToHead(data.matches);
  const rows = opps.map((o, i) => { const ms = chronological(o.matches); return { o, rank: i + 1, gd: o.gf - o.ga, last: ms[ms.length - 1]?.date ?? null, v: opponentVerdict(o) }; });
  const beaten = opps.filter((o) => o.won > 0).length;
  const bogey = opps.filter((o) => opponentVerdict(o)?.word === "Bogey team").length;
  const unbeaten = opps.filter((o) => o.played >= 3 && o.lost === 0).length;
  const neverBeaten = opps.filter((o) => o.won === 0).length;

  return (
    <PageTransition>
    <div className="space-y-8">
      <PageHeader eyebrow="Head to head" title="Opponents" sub={<>Every team we have met in a game that counted, ranked by how often we have had to meet them. Friendlies and forfeits are left out, so a few names on the fixture list never make it here. Lucky them.</>} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Opponents summary">
        <Stat label="Opponents" value={opps.length} sub="in games that counted" />
        <Stat label="Beaten at least once" value={beaten} tone="win" sub={`${neverBeaten} still waiting`} />
        <Stat label="Bogey teams" value={bogey} tone={bogey ? "loss" : "win"} sub="5+ games, no wins" />
        <Stat label="Unbeaten against" value={unbeaten} tone={unbeaten ? "win" : "default"} sub="3+ games, no defeats" />
      </section>

      <section>
        <SectionTitle sub="Tap a team for the full story, chart included.">Every opponent</SectionTitle>

        {/* Phones: one card per team. */}
        <ul className="stagger grid grid-cols-1 gap-2 sm:hidden">
          {rows.map(({ o, rank, gd, last, v }) => (
            <li key={o.key}>
              <Link href={`/opponents/${o.slug}`} className="card focus-ring flex items-center gap-3 p-3 transition-colors hover:border-white/15">
                <Roundel name={o.opponent} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="display shrink-0 text-lg leading-none text-ash">{rank}</span>
                    <span className="min-w-0 break-words font-semibold leading-tight text-cream">{o.opponent}</span>
                    {v && <Tag tone={v.tone} className="ml-auto shrink-0 !text-[10px]">{v.word}</Tag>}
                  </div>
                  <p className="tabular mt-1 text-xs text-ash"><span className="text-cream">{o.played}</span> played · <span className="text-mint-soft">{o.won}W</span> <span className="text-draw-soft">{o.drawn}D</span> <span className="text-loss-soft">{o.lost}L</span> · GD <span className={gdTone(gd)}>{signed(gd)}</span></p>
                  <p className="mt-0.5 truncate text-[11px] text-ash/80">{o.seasons.join(" ")} · last met {fmtDate(last)}</p>
                </div>
                <span className="display tabular shrink-0 text-2xl leading-none text-cream" aria-label={`Goals for ${o.gf}, against ${o.ga}`}>{o.gf}–{o.ga}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Bigger screens: the table. */}
        <div className="card hidden overflow-hidden sm:block">
          <div className="scroll-x overflow-x-auto">
            <table className="stats w-full">
              <thead>
                <tr><th>Opponent</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GF–GA</th><th className="num">GD</th><th className="hidden lg:table-cell">Seasons</th><th className="hidden md:table-cell">Last met</th><th>Verdict</th></tr>
              </thead>
              <tbody>
                {rows.map(({ o, rank, gd, last, v }) => (
                  <tr key={o.key}>
                    <td className="h-14">
                      <div className="flex items-center gap-3">
                        <span className="display w-5 shrink-0 text-lg text-ash">{rank}</span>
                        <Roundel name={o.opponent} size={34} />
                        <Link href={`/opponents/${o.slug}`} className="link max-w-[11rem] truncate font-medium text-cream lg:max-w-[16rem]" title={o.opponent}>{o.opponent}</Link>
                      </div>
                    </td>
                    <td className="num">{o.played}</td>
                    <td className="num text-mint-soft">{o.won}</td>
                    <td className="num text-draw-soft">{o.drawn}</td>
                    <td className="num text-loss-soft">{o.lost}</td>
                    <td className="num">{o.gf}–{o.ga}</td>
                    <td className={clsx("num font-semibold", gdTone(gd))}>{signed(gd)}</td>
                    <td className="hidden !whitespace-normal max-w-[9rem] text-xs leading-relaxed text-ash lg:table-cell">{o.seasons.join(" ")}</td>
                    <td className="hidden text-ash md:table-cell">{fmtDate(last)}</td>
                    <td>{v ? <Tag tone={v.tone}>{v.word}</Tag> : <span className="text-ash/50">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs text-ash">Bogey team: five or more meetings and not a single win. Easy street: three or more and never beaten. Rivals: eight or more meetings, whatever the outcome, which for us is usually a defeat.</p>
      </section>
    </div>
    </PageTransition>
  );
}
