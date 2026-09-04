import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { chronological, toLite } from "@/lib/stats";
import Link from "next/link";
import { MatchRow, PageHeader, SectionTitle } from "@/components/ui";
import { MatchesBrowser } from "@/components/matches-browser";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Matches", description: "Every Thameslink Hajduci result and fixture, filterable by season and outcome." };

export default async function MatchesPage() {
  const data = await getData();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = chronological(data.matches).filter((m) => !m.played && m.date && m.date >= today).slice(0, 5);
  const played = data.allTime.played;
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="Results & fixtures" title="Matches" sub={`${played} games that count, ${data.allTime.won} of them won. Friendlies and forfeits are listed too, but they only count towards character.`} right={<Link href="/submit" className="focus-ring inline-flex items-center rounded-lg border border-transparent bg-mint px-4 py-2 text-sm font-semibold text-night transition-colors hover:bg-mint-soft">Submit a score</Link>} />
      {upcoming.length > 0 && (
        <section className="mb-8">
          <SectionTitle sub="Kick-off times in London time. Arrival times in Hajduci time.">Coming up</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">{upcoming.map((m) => <MatchRow key={m.id} m={m} showSeason today={today} />)}</div>
        </section>
      )}
      <MatchesBrowser matches={data.matches.map(toLite)} seasons={[...(data.friendlies ? [data.friendlies] : []), ...data.seasons].map((s) => ({ id: s.id, number: s.number, title: s.title }))} today={today} />
    </>
    </PageTransition>
  );
}
