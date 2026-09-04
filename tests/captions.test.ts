import { describe, expect, it } from "vitest";
import { matchVerdict, serviceStatus } from "@/lib/captions";

describe("serviceStatus", () => {
  it("maps results onto the departure board", () => {
    expect(serviceStatus("W")).toEqual({ word: "On time", tone: "ok" });
    expect(serviceStatus("D")).toEqual({ word: "Delayed", tone: "late" });
    expect(serviceStatus("L")).toEqual({ word: "Cancelled", tone: "bad" });
    expect(serviceStatus(null)).toEqual({ word: "Expected", tone: "muted" });
  });
});

describe("matchVerdict", () => {
  const game = (ourGoals: number | null, theirGoals: number | null, extra: Partial<Parameters<typeof matchVerdict>[0]> = {}) => {
    const played = ourGoals !== null && theirGoals !== null;
    const result = played ? (ourGoals! > theirGoals! ? "W" : ourGoals! < theirGoals! ? "L" : "D") : null;
    return { result, ourGoals, theirGoals, type: null, played, ...extra } as Parameters<typeof matchVerdict>[0];
  };
  const verdict = (m: Parameters<typeof matchVerdict>[0], topGoals = 1, topScorer: string | null = "Seb Burgess", firstWin = false) => matchVerdict(m, topGoals, topScorer, firstWin);

  it("pending and non-counting games", () => {
    expect(verdict(game(null, null))).toBe("Kick-off pending. Attendance also pending.");
    expect(verdict(game(0, 5, { type: "Forfeit" }))).toBe("Forfeit. Doesn't count, thankfully or otherwise.");
    expect(verdict(game(3, 3, { type: "Friendly" }))).toBe("Friendly. Doesn't count, thankfully or otherwise.");
  });

  it("a hat-trick in defeat trumps everything else", () => {
    expect(verdict(game(3, 12), 3, "Seb Burgess")).toBe("Seb scored 3. Questions for everyone else.");
    expect(verdict(game(4, 5), 4, "Phil Knott")).toBe("Phil scored 4. Questions for everyone else.");
    expect(verdict(game(5, 2), 3, "Seb Burgess")).not.toMatch(/Questions/);
  });

  it("wins", () => {
    expect(verdict(game(3, 0))).toBe("A clean sheet. Frame it.");
    expect(verdict(game(7, 2))).toBe("A thrashing, and for once we were the ones doing it.");
    expect(verdict(game(3, 2), 1, "Seb Burgess", true)).toBe("First win of the season. Drinks on the treasurer.");
    expect(verdict(game(3, 2))).toBe("Three points. Drinks were had.");
    expect(verdict(game(1, 0), 1, null, true)).toBe("A clean sheet. Frame it.");
  });

  it("draws", () => {
    expect(verdict(game(0, 0))).toBe("Nil-nil. Nobody was hurt.");
    expect(verdict(game(2, 2))).toBe("A point. Nobody knew how to feel.");
  });

  it("defeats", () => {
    expect(verdict(game(2, 10))).toBe("Double figures conceded. The keeper has been offered counselling.");
    expect(verdict(game(0, 3))).toBe("Failed to trouble the scorer. Or the keeper. Or anyone.");
    expect(verdict(game(2, 3))).toBe("Narrow. Unlucky. Robbed, probably.");
    expect(verdict(game(1, 6))).toBe("A pasting. We move on.");
    expect(verdict(game(2, 5))).toBe("Beaten, but the bantz were elite.");
    expect(verdict(game(0, 10))).toBe("Double figures conceded. The keeper has been offered counselling.");
  });
});
