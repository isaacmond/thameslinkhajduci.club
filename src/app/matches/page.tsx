import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { chronological } from "@/lib/stats";
import { MatchRow, PageHeader, SectionTitle } from "@/components/ui";
import { MatchesBrowser } from "@/components/matches-browser";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Matches", description: "Every Thameslink Hajduci result and fixture, filterable by season and outcome." };

export default async function MatchesPage() {
  const data = await getData();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = chronological(data.matches).filter((m) => !m.played && m.date && m.date >= today).slice(0, 5);
  const played = data.matches.filter((m) => m.played).length;
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="Results & fixtures" title="Matches" sub={`${played} games played, ${data.allTime.won} of them won. Friendlies and forfeits are listed but don't count towards anything except character.`} />
      {upcoming.length > 0 && (
        <section className="mb-8">
          <SectionTitle sub="Kick-off times in London time. Arrival times in Hajduci time.">Coming up</SectionTitle>
          <div className="space-y-1.5">{upcoming.map((m) => <MatchRow key={m.id} m={m} showSeason />)}</div>
        </section>
      )}
      <MatchesBrowser matches={data.matches} seasons={data.seasons.map((s) => ({ id: s.id, number: s.number, title: s.title }))} />
    </>
    </PageTransition>
  );
}
