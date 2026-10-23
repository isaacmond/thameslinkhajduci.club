import { describe, expect, it } from "vitest";
import { appearanceCounts, applyRingerLevies, levyLine, levyWindow, pickRegulars, regularsFor, ringerLevy } from "@/lib/ringers";
import { club, line, match } from "./helpers";
const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

describe("who the regulars are", () => {
  it("takes the ten with the most games, three at least, most games first", () => {
    const counts = Object.fromEntries(names.map((n, i) => [n, 12 - i])); // A 12 … L 1
    expect(pickRegulars(counts)).toEqual(names.slice(0, 10));
  });
  it("drops anyone under three games even when that leaves fewer than ten", () => {
    expect(pickRegulars({ A: 5, B: 3, C: 2, D: 1 })).toEqual(["A", "B"]);
    expect(pickRegulars({ A: 2 })).toEqual([]);
  });
  it("charges everyone tied on the tenth place rather than picking by alphabet", () => {
    const counts = { ...Object.fromEntries(names.slice(0, 9).map((n) => [n, 5])), J: 3, K: 3, L: 3 };
    expect(pickRegulars(counts)).toEqual([...names.slice(0, 9), "J", "K", "L"]);
  });
  it("counts appearances; ringers have no names to count", () => {
    const games = [match({ date: "2026-09-01", ourGoals: 1, theirGoals: 0, ringers: 1, lineup: [line("A"), line("B", 0, 0, false)] })];
    expect(appearanceCounts(games)).toEqual({ A: 1 });
  });
});

describe("the window", () => {
  const season = (n: number) => Array.from({ length: n }, (_, i) => match({ seasonId: "S8", gw: i + 1, date: `2026-09-${String(i + 1).padStart(2, "0")}`, ourGoals: 1, theirGoals: 0, lineup: [line("A")] }));
  it("is the last ten counted games up to and including the one being recorded", () => {
    const games = season(14);
    const w = levyWindow(games[11], games);
    expect(w.map((m) => m.gw)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("leaves out friendlies, forfeits and games still to be played, and lets a friendly borrow the league window before it (a same-day league game counts as after)", () => {
    const games = [...season(5), match({ seasonId: "S8", gw: 6, date: "2026-09-06", ourGoals: 0, theirGoals: 8, type: "Forfeit", lineup: [line("Z")] }), match({ seasonId: "S8", gw: 7, date: "2026-09-07", lineup: [] })];
    const friendly = match({ seasonId: "FR", gw: 1, date: "2026-09-04", ourGoals: 3, theirGoals: 3, ringers: 1, lineup: [line("A")] });
    expect(levyWindow(games[4], games).map((m) => m.gw)).toEqual([1, 2, 3, 4, 5]);
    expect(levyWindow(friendly, [...games, friendly]).map((m) => m.gw)).toEqual([1, 2, 3]);
  });
  it("never charges anyone who was on the pitch that night, and is empty when no absent regular has three games", () => {
    const games = Array.from({ length: 4 }, (_, i) => match({ seasonId: "S8", gw: i + 1, date: `2026-09-0${i + 1}`, ourGoals: 1, theirGoals: 0, lineup: [line("A"), line("B"), ...(i < 2 ? [line("C")] : [])] }));
    const tonight = match({ seasonId: "S8", gw: 5, date: "2026-09-05", ourGoals: 2, theirGoals: 2, ringers: 1, lineup: [line("A")] });
    expect(regularsFor(tonight, [...games, tonight])).toEqual(["B"]); // A played; C has two
    const both = match({ seasonId: "S8", gw: 5, date: "2026-09-05", ourGoals: 2, theirGoals: 2, ringers: 1, lineup: [line("A"), line("B")] });
    expect(regularsFor(both, [...games, both])).toEqual([]);
    expect(ringerLevy({ ...both, costPerPlayer: 10 }, regularsFor(both, [...games, both]))).toBeNull();
  });
});

describe("the levy", () => {
  it("is the ringers' heads' worth of the pitch, split equally between the regulars", () => {
    const m = match({ date: "2026-10-06", ourGoals: 11, theirGoals: 5, matchCost: 79.95, costPerPlayer: 79.95 / 6, ringers: 1, ringerGoals: 1, lineup: [line("A"), line("B"), line("C"), line("D"), line("E")] });
    const l = ringerLevy(m, ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"])!;
    expect(l.ringers).toBe(1); expect(l.total).toBeCloseTo(13.325, 6); expect(l.each).toBeCloseTo(1.3325, 6); expect(l.payers.length).toBe(10);
    expect(levyLine(l)).toBe("1 ringer played: their £13.33 is split between the 10 regulars who did not play, at £1.33 each (A, B, C, D, E, F, G, H, I, J).");
  });
  it("is nothing when there are no ringers, the pitch was free, or nobody can be charged", () => {
    expect(ringerLevy(match({ date: "2026-10-06", costPerPlayer: 10, lineup: [line("A")] }), ["A"])).toBeNull();
    expect(ringerLevy(match({ date: "2026-10-06", costPerPlayer: 0, ringers: 1 }), ["A"])).toBeNull();
    expect(ringerLevy(match({ date: "2026-10-06", costPerPlayer: 10, ringers: 1 }), [])).toBeNull();
  });
  it("is set on every played game with ringers across the seasons, and the regulars reach across a season boundary", () => {
    const s7 = Array.from({ length: 8 }, (_, i) => match({ seasonId: "S7", gw: i + 1, date: `2026-08-${String(i + 1).padStart(2, "0")}`, ourGoals: 1, theirGoals: 0, lineup: [line("A"), line("B"), line("C"), ...(i < 3 ? [line("D")] : [])] }));
    const s8 = [match({ seasonId: "S8", gw: 1, date: "2026-09-01", ourGoals: 2, theirGoals: 2, matchCost: 60, costPerPlayer: 20, ringers: 1, lineup: [line("A"), line("B")] })];
    const data = club([...s7, ...s8]);
    applyRingerLevies(data.seasons, data.friendlies);
    const m = data.seasons.find((s) => s.id === "S8")!.matches[0];
    // last ten: S7 GW1–8 (A, B, C each 8; D 3) + S8 GW1 → C and D qualify; A and B played, so they pay nothing extra
    expect(m.levy).toEqual({ ringers: 1, total: 20, each: 10, payers: ["C", "D"] });
    expect(data.seasons.find((s) => s.id === "S7")!.matches.every((x) => x.levy === null)).toBe(true);
  });
});
