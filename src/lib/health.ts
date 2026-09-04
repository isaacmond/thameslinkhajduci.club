import type { ClubData, Match, Season } from "./types";
import { fmtDate, gwLabel, opponentKey, seasonHref } from "./stats";
import { londonToday } from "./time";
import { slugify } from "./slug";
import { rejectedPhotos } from "./sheet";

/**
 * Sanity checks over the parsed records, for the admin. Pure: nothing here talks to Google.
 * high = a number on the site is wrong; medium = something is missing or will be silently ignored; low = tidy-up.
 */
export type Severity = "high" | "medium" | "low";
export interface HealthIssue {
  severity: Severity;
  /** stable id such as "partial-scorers:s6-gw3", handy as a React key and for de-duping alerts */
  key: string;
  message: string;
  /** where to look on the site, when there is somewhere to look */
  href?: string;
}
export interface HealthReport {
  issues: HealthIssue[];
  counts: Record<Severity, number>;
  checkedAt: string;
}

const ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
export const SEVERITY_LABEL: Record<Severity, string> = { high: "Needs fixing", medium: "Worth a look", low: "Minor" };

const tabName = (seasonId: string) => (seasonId === "FR" ? "Friendlies" : seasonId);
const where = (m: Match) => `${tabName(m.seasonId)} ${gwLabel(m)} v ${m.opponent}, ${fmtDate(m.date)}`;
/** A real game with a line-up: league fixtures and friendlies. Forfeits/walkovers have no line-up by design. */
const isGame = (m: Match) => !m.type || /^friendly$/i.test(m.type);

export function sheetHealth(data: ClubData, today: string = londonToday()): HealthReport {
  const issues: HealthIssue[] = [];
  const push = (severity: Severity, key: string, message: string, href?: string) => issues.push({ severity, key, message, href });

  const allSeasons: Season[] = [...data.seasons, ...(data.friendlies ? [data.friendlies] : [])];
  const rosters = new Map<string, Set<string>>(allSeasons.map((s) => [s.id, new Set(s.players)]));
  const everyone = new Set<string>([...allSeasons.flatMap((s) => s.players), ...data.players.map((p) => p.name)]);

  for (const m of data.matches) {
    const href = `/matches/${m.id}`;
    const at = where(m);
    if (opponentKey(m.opponent) === "forfeit") push("low", `forfeit-name:${m.id}`, `${tabName(m.seasonId)} ${gwLabel(m)}: the opponent is written as "Forfeit". Keep the real opponent in the Opponent row and put Forfeit in the Type row.`, href);
    if (!m.played) {
      if (isGame(m) && m.date && m.date < today) push("medium", `no-score:${m.id}`, `${at}: kicked off but has no score yet.`, href);
      continue;
    }
    if (!isGame(m)) continue;

    const og = m.ourGoals ?? 0, tg = m.theirGoals ?? 0;
    const computed = og > tg ? "W" : og < tg ? "L" : "D";
    if (m.result && m.result !== computed) push("high", `result-mismatch:${m.id}`, `${at}: the Result row says ${m.result} but the score ${og}–${tg} is a ${computed}.`, href);

    const played = m.lineup.filter((l) => l.played).length;
    if (played === 0) push("high", `no-apps:${m.id}`, `${at}: has a score but nobody is marked in the APPEARANCES grid, so it counts for the club and for no one.`, href);

    const scored = m.lineup.reduce((t, l) => t + l.goals, 0);
    const assisted = m.lineup.reduce((t, l) => t + l.assists, 0);
    if (scored > og) push("high", `too-many-scorers:${m.id}`, `${at}: the GOALS grid adds up to ${scored} but "Our goals" says ${og}.`, href);
    else if (og > 0 && scored === 0) push("low", `no-scorers:${m.id}`, `${at}: we scored ${og} but no scorer is logged, so the game is left out of goals-per-game.`, href);
    else if (og > 0 && scored < og) push("medium", `partial-scorers:${m.id}`, `${at}: ${scored} of ${og} goals have a scorer; ${og - scored} unclaimed.`, href);
    if (assisted > og) push("high", `assists-exceed:${m.id}`, `${at}: ${assisted} assists logged for ${og} goals.`, href);

    if (m.motm) {
      const onRoster = rosters.get(m.seasonId)?.has(m.motm) ?? false;
      const inLineup = m.lineup.some((l) => l.player === m.motm && l.played);
      if (!onRoster) push("medium", `motm-unknown:${m.id}`, `${at}: MOTM "${m.motm}" is not on the ${tabName(m.seasonId)} roster, so the award is not counted. Check the spelling or add an alias.`, href);
      else if (!inLineup) push("medium", `motm-absent:${m.id}`, `${at}: MOTM ${m.motm} has no appearance mark for this game.`, href);
    }
  }

  // Two league fixtures on one night is a copy-paste slip. A forfeit followed by a friendly on the same night is just Thursday, so typed rows are left out.
  for (const s of data.seasons) {
    const byDate = new Map<string, Match[]>();
    for (const m of s.matches) if (m.date && !m.type) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);
    for (const [date, ms] of byDate) if (ms.length > 1) push("medium", `dup-date:${s.id}:${date}`, `${s.id}: ${ms.map(gwLabel).join(" and ")} share the date ${fmtDate(date)}. One of them is probably last week's row copied down.`, seasonHref(s.id));
  }
  for (const s of allSeasons) {
    const payer = data.money.paidBy[s.id] ?? s.summary.paidBy;
    if (payer && !s.matches.some((m) => m.matchCost > 0)) push("low", `paidby-no-cost:${s.id}`, `${tabName(s.id)}: "Paid by" is ${payer} but no game has a match cost, so nothing is credited to them.`, seasonHref(s.id));
  }

  for (const r of data.money.rows) {
    if (!everyone.has(r.player)) push("medium", `money-unknown:${slugify(r.player)}`, `Money tab: "${r.player}" is not on any season roster. A typo, or someone who never kicked a ball.`, "/money");
  }
  // Photo cells the parser refused (see photoAllowed in sheet.ts): the OG image reads local photos from disk, so only /players/… files and https links get through.
  for (const [name, value] of rejectedPhotos) push("low", `photo-rejected:${slugify(name)}`, `Squad tab: the photo for ${name} is "${value}", which is neither a /players/… file bundled with the site nor an https link, so it is ignored.`, `/squad/${slugify(name)}`);

  issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const i of issues) counts[i.severity]++;
  return { issues, counts, checkedAt: new Date().toISOString() };
}
