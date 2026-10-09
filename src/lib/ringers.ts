import type { Match, RingerLevy, Season } from "./types";

/**
 * Ringers: outside players borrowed for a night when the team sheet runs short. A ringer counts as an appearance like
 * anyone else (the pitch is split by heads on the pitch, ringers included) but pays nothing. Their share is levied on the
 * regulars instead, equally, so the few who did turn up are not left carrying the cost of a half-empty team sheet.
 *
 * Regulars, as agreed with the admin (9 Oct 2026): of the players who were NOT on the pitch that night, the ten with the
 * most appearances in the last ten league games (the game being recorded included), each with at least three. Ties on
 * the tenth place are all charged rather than picking by alphabet. Whoever did play never pays for the ringer: the whole
 * point is that a half-empty team sheet is the absentees' bill. If no absent regular qualifies there is no levy and the
 * ringer's share stays with whoever paid for the pitch. Pure, no I/O.
 */
export const LEVY_WINDOW = 10;
export const LEVY_PAYERS = 10;
export const LEVY_MIN_APPS = 3;

/** Appearances per player across a set of games, ringer nights excluded (a ringer is not on their way to being a regular). */
export function appearanceCounts(games: Pick<Match, "lineup">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of games) for (const l of m.lineup) if (l.played && !l.ringer) counts[l.player] = (counts[l.player] ?? 0) + 1;
  return counts;
}

/** The regulars for a set of appearance counts: top LEVY_PAYERS by count with LEVY_MIN_APPS or more, ties on the last place included, most games first. */
export function pickRegulars(counts: Record<string, number>): string[] {
  const ranked = Object.entries(counts).filter(([, n]) => n >= LEVY_MIN_APPS).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length <= LEVY_PAYERS) return ranked.map(([p]) => p);
  const cut = ranked[LEVY_PAYERS - 1][1];
  return ranked.filter(([, n]) => n >= cut).map(([p]) => p);
}

const order = (a: Pick<Match, "date" | "seasonNumber" | "gw">, b: Pick<Match, "date" | "seasonNumber" | "gw">) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.seasonNumber - b.seasonNumber || a.gw - b.gw;

/**
 * The league games that make up the window for `match`: the last LEVY_WINDOW played, counted games up to and including it
 * (or, for a friendly, up to its date). `counted` may be in any order and may include `match` itself.
 */
export function levyWindow(match: Match, counted: Match[]): Match[] {
  const pool = counted.filter((m) => m.countsForRecords && m.played && m.id !== match.id && order(m, match) <= 0).sort(order);
  if (match.countsForRecords && match.played) pool.push(match);
  return pool.slice(-LEVY_WINDOW);
}

/** Who picks up the ringers' share when `match` is recorded: the absent regulars. Empty when none of them has three games yet. */
export function regularsFor(match: Match, counted: Match[]): string[] {
  const counts = appearanceCounts(levyWindow(match, counted));
  for (const l of match.lineup) if (l.played) delete counts[l.player];
  return pickRegulars(counts);
}

/** The levy for a played game with ringers on a pitch that cost money; null when there is nothing to spread. */
export function ringerLevy(match: Pick<Match, "lineup" | "costPerPlayer">, regulars: string[]): RingerLevy | null {
  const ringers = match.lineup.filter((l) => l.played && l.ringer).map((l) => l.player);
  if (!ringers.length || match.costPerPlayer <= 0 || !regulars.length) return null;
  const total = ringers.length * match.costPerPlayer;
  return { ringers, total, each: total / regulars.length, payers: [...regulars] };
}

/** Sets `levy` on every played match across the seasons, in place. Friendlies draw their regulars from the league games around them. */
export function applyRingerLevies(seasons: Season[], friendlies: Season | null): void {
  const all = [...seasons, ...(friendlies ? [friendlies] : [])].flatMap((s) => s.matches);
  const counted = all.filter((m) => m.countsForRecords && m.played);
  for (const m of all) m.levy = m.played && m.lineup.some((l) => l.played && l.ringer) ? ringerLevy(m, regularsFor(m, counted)) : null;
}

/** One line for the group chat and the fixture page: who the ringers were and who is paying for them. */
export function levyLine(levy: RingerLevy, fmt: (n: number) => string = (n) => `£${n.toFixed(2)}`): string {
  const who = levy.ringers.join(", ");
  return `${who} ${levy.ringers.length === 1 ? "is a ringer: their" : "are ringers: their"} ${fmt(levy.total)} is split between the ${levy.payers.length} regular${levy.payers.length === 1 ? "" : "s"} who did not play, at ${fmt(levy.each)} each (${levy.payers.join(", ")}).`;
}
