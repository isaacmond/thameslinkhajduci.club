import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { chronological, toLite } from "@/lib/stats";
import Link from "next/link";
import { londonToday } from "@/lib/time";
import { btn } from "@/components/button";
import { MatchRow, PageHeader, SectionTitle } from "@/components/ui";
import { MatchesBrowser } from "@/components/matches-browser";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Matches", description: "Every Thameslink Hajduci result and fixture." };

export default async function MatchesPage() {
  const data = await getData();
  const today = londonToday();
  const upcoming = chronological(data.matches).filter((m) => !m.played && m.date && m.date >= today).slice(0, 5);
  return (
    <PageTransition>
    <div className="space-y-10">
      <PageHeader eyebrow="Results and fixtures" title="Matches" sub="Every match the club has played, and the ones still to come." right={<Link href="/submit" className={btn("primary")}>Add a result</Link>} />
      {upcoming.length > 0 && (
        <section>
          <SectionTitle>Coming up</SectionTitle>
          <div className="card grid grid-cols-1 gap-0.5 p-2 lg:grid-cols-2">{upcoming.map((m) => <MatchRow key={m.id} m={m} showSeason today={today} />)}</div>
        </section>
      )}
      <section>
        <SectionTitle>All matches</SectionTitle>
        <MatchesBrowser matches={data.matches.map(toLite)} seasons={[...(data.friendlies ? [data.friendlies] : []), ...data.seasons].map((s) => ({ id: s.id, number: s.number, title: s.title }))} today={today} />
      </section>
    </div>
    </PageTransition>
  );
}
