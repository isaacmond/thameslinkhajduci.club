/** One-line, stat-driven blurbs so a card with no photo or bio still says something about the person. Pure and deterministic. */
export function playerCaption(p: { apps: number; goals: number; assists: number; motm: number; champagne: number; winRate: number; goalsPerGame: number; positions?: string[]; losses?: number }): string {
  const gk = p.positions?.includes("GK");
  if (p.apps === 0) return "Signed. Yet to be sighted.";
  if (p.apps < 3) return `${p.apps} app${p.apps === 1 ? "" : "s"}. Early days, or a cameo.`;
  if (p.goalsPerGame >= 1) return p.assists <= 1 ? "Scores every game. Does not pass." : "Scores every game. Occasionally passes.";
  if (gk && p.goals === 0) return "Goalkeeper. Goals are someone else's problem.";
  if (p.champagne >= 2) return "Champagne moments: plural. Cult hero.";
  if (p.motm >= 4) return "Serial man of the match.";
  if (p.winRate === 0 && p.apps >= 3) return "Yet to taste victory. Character-building.";
  if (p.assists >= 5 && p.assists >= p.goals) return "Prefers the assist. Very generous.";
  if (p.apps >= 50) return "Never misses a Tuesday.";
  if (p.goals === 0 && p.apps >= 15) return `${p.apps} apps, 0 goals. Defensive, allegedly.`;
  if (p.goalsPerGame >= 0.6) return "Knows where the goal is.";
  if (p.winRate >= 30) return `Wins ${Math.round(p.winRate)}% of the time. Lucky charm.`;
  return `${p.goals} goal${p.goals === 1 ? "" : "s"} in ${p.apps} apps. Solid.`;
}

/** Match-page verdict, data-aware. */
export function matchVerdict(m: { result: "W" | "D" | "L" | null; ourGoals: number | null; theirGoals: number | null; type: string | null; played: boolean }, topScorerGoals: number, topScorer: string | null, isFirstWinOfSeason: boolean): string {
  if (!m.played) return "Kick-off pending. Attendance also pending.";
  if (m.type) return `${m.type}. Doesn't count, thankfully or otherwise.`;
  const og = m.ourGoals ?? 0, tg = m.theirGoals ?? 0, margin = og - tg;
  const first = topScorer?.split(" ")[0];
  if (m.result === "L" && topScorerGoals >= 3) return `${first} scored ${topScorerGoals}. Questions for everyone else.`;
  if (tg >= 10) return "Double figures conceded. The keeper has been offered counselling.";
  if (m.result === "W" && tg === 0) return "A clean sheet. Frame it.";
  if (m.result === "W" && margin >= 5) return "A thrashing, and for once we were the ones doing it.";
  if (m.result === "W" && isFirstWinOfSeason) return "First win of the season. Drinks on the treasurer.";
  if (m.result === "W") return "Three points. Drinks were had.";
  if (m.result === "D") return og === 0 ? "Nil-nil. Nobody was hurt." : "A point. Nobody knew how to feel.";
  if (og === 0) return "Failed to trouble the scorer. Or the keeper. Or anyone.";
  if (margin === -1) return "Narrow. Unlucky. Robbed, probably.";
  if (margin <= -5) return "A pasting. We move on.";
  return "Beaten, but the bantz were elite.";
}

/** Transport-status word for a result, shared by the board, match hero and OG image. */
export function serviceStatus(result: "W" | "D" | "L" | null): { word: string; tone: "ok" | "late" | "bad" | "muted" } {
  if (result === "W") return { word: "On time", tone: "ok" };
  if (result === "D") return { word: "Delayed", tone: "late" };
  if (result === "L") return { word: "Cancelled", tone: "bad" };
  return { word: "Expected", tone: "muted" };
}
