/** One line under a result, only when there is something worth saying. Null otherwise: the score speaks for itself. */
export function matchVerdict(m: { result: "W" | "D" | "L" | null; ourGoals: number | null; theirGoals: number | null; type: string | null; played: boolean }, topScorerGoals: number, topScorer: string | null, isFirstWinOfSeason: boolean): string | null {
  if (!m.played || m.type) return null;
  const tg = m.theirGoals ?? 0;
  if (topScorerGoals >= 3 && topScorer) return topScorerGoals === 3 ? `A hat-trick for ${topScorer}.` : `${topScorerGoals} goals for ${topScorer}.`;
  if (m.result === "W" && isFirstWinOfSeason) return "The first win of the season.";
  if (m.result === "W" && tg === 0) return "A clean sheet.";
  return null;
}

/** The result as a word, for share text and image captions. */
export const resultWord = (result: "W" | "D" | "L" | null) => (result === "W" ? "Win" : result === "D" ? "Draw" : result === "L" ? "Defeat" : "");
