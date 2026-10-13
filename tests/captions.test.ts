import { describe, expect, it } from "vitest";
import { matchVerdict, resultWord } from "@/lib/captions";

describe("resultWord", () => {
  it("names the result plainly", () => {
    expect(resultWord("W")).toBe("Win");
    expect(resultWord("D")).toBe("Draw");
    expect(resultWord("L")).toBe("Defeat");
    expect(resultWord(null)).toBe("");
  });
});

describe("matchVerdict", () => {
  const game = (ourGoals: number | null, theirGoals: number | null, extra: Partial<Parameters<typeof matchVerdict>[0]> = {}) => {
    const played = ourGoals !== null && theirGoals !== null;
    const result = played ? (ourGoals! > theirGoals! ? "W" : ourGoals! < theirGoals! ? "L" : "D") : null;
    return { result, ourGoals, theirGoals, type: null, played, ...extra } as Parameters<typeof matchVerdict>[0];
  };
  const verdict = (m: Parameters<typeof matchVerdict>[0], topGoals = 1, topScorer: string | null = "Seb Burgess", firstWin = false) => matchVerdict(m, topGoals, topScorer, firstWin);

  it("says nothing about games not yet played, friendlies or forfeits", () => {
    expect(verdict(game(null, null))).toBeNull();
    expect(verdict(game(0, 5, { type: "Forfeit" }))).toBeNull();
    expect(verdict(game(3, 3, { type: "Friendly" }), 3)).toBeNull();
  });

  it("marks a hat-trick or better, whatever the result", () => {
    expect(verdict(game(3, 12), 3, "Seb Burgess")).toBe("A hat-trick for Seb Burgess.");
    expect(verdict(game(5, 2), 4, "Phil Knott")).toBe("4 goals for Phil Knott.");
  });

  it("marks the first win of a season, then a clean sheet", () => {
    expect(verdict(game(3, 2), 1, "Seb Burgess", true)).toBe("The first win of the season.");
    expect(verdict(game(1, 0), 1, null, true)).toBe("The first win of the season.");
    expect(verdict(game(3, 0))).toBe("A clean sheet.");
  });

  it("otherwise lets the score speak for itself", () => {
    for (const [a, b] of [[3, 2], [0, 0], [2, 2], [2, 10], [0, 3], [1, 6]]) expect(verdict(game(a, b))).toBeNull();
  });
});
