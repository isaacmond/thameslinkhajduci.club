import { describe, expect, it } from "vitest";
import { sheetHealth } from "@/lib/health";
import { parseWorkbook } from "@/lib/sheet";
import { club, fixtureWorkbook, line, match } from "./helpers";

const TODAY = "2026-06-01";

describe("sheetHealth: synthetic", () => {
  const clean = match({ date: "2026-05-01", gw: 1, ourGoals: 3, theirGoals: 2, motm: "Seb Burgess", lineup: [line("Seb Burgess", 2, 1), line("Phil Knott", 1, 1)] });
  const tooManyAssists = match({ date: "2026-05-02", gw: 2, ourGoals: 2, theirGoals: 2, motm: "Ghost Player", lineup: [line("Seb Burgess", 2, 3)] });
  const nobodyPlayed = match({ date: "2026-05-03", gw: 3, ourGoals: 2, theirGoals: 0, lineup: [] });
  const partial = match({ date: "2026-05-04", gw: 4, ourGoals: 4, theirGoals: 1, lineup: [line("Seb Burgess", 2), line("Phil Knott")] });
  const motmAbsent = match({ date: "2026-05-04", gw: 5, ourGoals: 1, theirGoals: 1, motm: "Phil Knott", lineup: [line("Seb Burgess", 1)] });
  const overdue = match({ date: "2026-05-20", gw: 6 });
  const future = match({ date: "2026-06-20", gw: 7 });
  const forfeit = match({ date: "2026-05-28", gw: 8, ourGoals: 0, theirGoals: 5, type: "Forfeit", opponent: "Forfeit" });
  const wrongResult = match({ date: "2026-05-28", gw: 9, ourGoals: 1, theirGoals: 3, result: "W", lineup: [line("Seb Burgess", 1)] });
  const data = club([clean, tooManyAssists, nobodyPlayed, partial, motmAbsent, overdue, future, forfeit, wrongResult], [], {
    money: { paidBy: { S1: "Isaac Mond" }, rows: [{ player: "Nobody Special", charges: {}, totalCharged: 10, paid: 0, balance: 10, pitchCovered: 0 }], payments: [] },
  });
  const report = sheetHealth(data, TODAY);
  const keys = report.issues.map((i) => i.key);

  it("flags the impossible as high", () => {
    expect(keys).toContain(`assists-exceed:${tooManyAssists.id}`);
    expect(keys).toContain(`no-apps:${nobodyPlayed.id}`);
    expect(keys).toContain(`result-mismatch:${wrongResult.id}`);
    expect(report.issues.filter((i) => i.severity === "high").map((i) => i.key).sort()).toEqual([`assists-exceed:${tooManyAssists.id}`, `no-apps:${nobodyPlayed.id}`, `result-mismatch:${wrongResult.id}`].sort());
  });

  it("flags gaps as medium", () => {
    expect(keys).toContain(`partial-scorers:${partial.id}`);
    expect(keys).toContain(`motm-unknown:${tooManyAssists.id}`);
    expect(keys).toContain(`motm-absent:${motmAbsent.id}`);
    expect(keys).toContain(`no-score:${overdue.id}`);
    expect(keys).toContain("dup-date:S1:2026-05-04");
    expect(keys.filter((k) => k.startsWith("dup-date:"))).toEqual(["dup-date:S1:2026-05-04"]); // the forfeit sharing a night with GW9 is fine
    expect(keys).toContain("money-unknown:nobody-special");
    for (const k of ["partial-scorers", "motm-unknown", "motm-absent", "no-score", "dup-date", "money-unknown"]) expect(report.issues.find((i) => i.key.startsWith(k))?.severity).toBe("medium");
  });

  it("flags tidy-ups as low", () => {
    expect(keys).toContain(`no-scorers:${nobodyPlayed.id}`);
    expect(keys).toContain(`forfeit-name:${forfeit.id}`);
    expect(keys).toContain("paidby-no-cost:S1");
    for (const k of ["no-scorers", "forfeit-name", "paidby-no-cost"]) expect(report.issues.find((i) => i.key.startsWith(k))?.severity).toBe("low");
  });

  it("leaves the clean game, the future fixture and the forfeit line-up alone", () => {
    expect(keys.filter((k) => k.endsWith(`:${clean.id}`))).toEqual([]);
    expect(keys.filter((k) => k.endsWith(`:${future.id}`))).toEqual([]);
    expect(keys.filter((k) => k.endsWith(`:${forfeit.id}`))).toEqual([`forfeit-name:${forfeit.id}`]);
  });

  it("orders high first, counts add up and every issue points somewhere", () => {
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < report.issues.length; i++) expect(order[report.issues[i - 1].severity]).toBeLessThanOrEqual(order[report.issues[i].severity]);
    expect(report.counts.high + report.counts.medium + report.counts.low).toBe(report.issues.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of report.issues) { expect(i.message.length).toBeGreaterThan(10); expect(i.href).toMatch(/^\//); }
    expect(Date.parse(report.checkedAt)).not.toBeNaN();
  });

  it("is all clear when there is nothing wrong", () => {
    const ok = sheetHealth(club([clean, future]), TODAY);
    expect(ok.issues).toEqual([]);
    expect(ok.counts).toEqual({ high: 0, medium: 0, low: 0 });
  });
});

describe("sheetHealth: the real workbook", () => {
  const report = sheetHealth(parseWorkbook(fixtureWorkbook()), TODAY);
  const keys = report.issues.map((i) => i.key);

  it("does not contradict itself", () => {
    expect(report.counts.high + report.counts.medium + report.counts.low).toBe(report.issues.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of report.issues) expect(i.href).toMatch(/^\/(matches|seasons|money)/);
  });

  it("spots the known wrinkles in the snapshot", () => {
    // S1 GW5: two scorers and two assists logged against a single goal.
    expect(report.issues.filter((i) => i.severity === "high").map((i) => i.key).sort()).toEqual(["assists-exceed:s1-gw5", "too-many-scorers:s1-gw5"]);
    // S7 has a forfeit and a friendly sharing a night with league games: normal, not a duplicate.
    expect(keys.filter((k) => k.startsWith("dup-date:"))).toEqual([]);
    expect(keys).toContain("no-scorers:s4-gw3");
    expect(keys).toContain("forfeit-name:s3-gw1");
    expect(keys).toContain("partial-scorers:s6-gw2");
    // Forfeits have no line-up by design, so they must not be reported as games nobody played.
    expect(keys.filter((k) => k.startsWith("no-apps:"))).toEqual([]);
  });
});
