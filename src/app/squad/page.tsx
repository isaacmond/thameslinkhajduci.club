import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SquadGrid, type SquadCard } from "@/components/squad-grid";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Squad", description: "Every player who has pulled on the Thameslink Hajduci shirt, with career numbers, photos and positions." };

export default async function SquadPage() {
  const data = await getData();
  const current = data.seasons.find((s) => s.isCurrent);
  const cards: SquadCard[] = data.players.map((p) => ({
    name: p.name, slug: p.slug, apps: p.apps, goals: p.goals, assists: p.assists, motm: p.motm, goalsPerGame: p.goalsPerGame, winRate: p.winRate, debut: p.debut,
    seasonsPlayed: p.seasons.filter((x) => x.apps > 0).length,
    activeThisSeason: !!current && p.seasons.some((x) => x.seasonId === current.id && x.apps > 0),
    photo: p.extra.photo ?? null, shirt: p.extra.shirt ?? null, positions: p.extra.positions ?? [], nickname: p.extra.nickname ?? null,
  }));
  const active = cards.filter((c) => c.activeThisSeason).length;
  return (
    <PageTransition>
    <>
      <PageHeader eyebrow="Темзлинк Хайдуки · the squad" title="Squad" sub={<>{cards.length} have pulled on the shirt.{current && active > 0 && <> {active} still do, so far this season.</>} Tap anyone for the full file.</>} />
      <SquadGrid players={cards} currentSeason={current?.id ?? null} />
    </>
    </PageTransition>
  );
}
