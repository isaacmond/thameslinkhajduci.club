import { beforeAll, describe, expect, it } from "vitest";
import { canonicalName, canonicalOpponent, parseWorkbook } from "@/lib/sheet";
import type { ClubData } from "@/lib/types";
import { fixtureWorkbook } from "./helpers";

/** Reconciliation against the committed workbook snapshot: these totals were counted by hand against the tabs. */
let data: ClubData;
beforeAll(() => { data = parseWorkbook(fixtureWorkbook()); });

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("parseWorkbook: totals", () => {
  it("counts every appearance, goal and assist once", () => {
    expect(sum(data.players.map((p) => p.apps))).toBe(531);
    expect(sum(data.players.map((p) => p.goals))).toBe(195);
    expect(sum(data.players.map((p) => p.assists))).toBe(40);
  });

  it("player totals agree with the match line-ups that count", () => {
    const counted = data.matches.filter((m) => m.countsForRecords);
    expect(sum(counted.flatMap((m) => m.lineup.filter((l) => l.played).map(() => 1)))).toBe(531);
    expect(sum(counted.flatMap((m) => m.lineup.map((l) => l.goals)))).toBe(195);
    expect(sum(counted.flatMap((m) => m.lineup.map((l) => l.assists)))).toBe(40);
  });

  it("season summaries are recomputed from the games that count", () => {
    const s6 = data.seasons.find((s) => s.id === "S6")!;
    expect(s6.summary).toMatchObject({ won: 2, drawn: 2, lost: 10, goalsFor: 47, goalsAgainst: 101 });
    expect(s6.summary.played).toBe(14);
    for (const s of data.seasons) {
      const counted = s.matches.filter((m) => m.countsForRecords && m.played);
      expect(s.summary.played).toBe(counted.length);
      expect(s.summary.won + s.summary.drawn + s.summary.lost).toBe(counted.length);
    }
    expect(data.allTime.played).toBe(sum(data.seasons.map((s) => s.summary.played)));
  });

  it("Seb Burgess: goals, apps and the goals-per-game denominator", () => {
    const seb = data.players.find((p) => p.name === "Seb Burgess")!;
    expect(seb).toBeDefined();
    expect(seb.goals).toBe(58);
    expect(seb.apps).toBe(54);
    expect(seb.gpgGames).toBe(50);
    expect(seb.gpgGames).toBeLessThanOrEqual(seb.apps);
    expect(seb.goalsPerGame).toBe(+(58 / 50).toFixed(2));
  });
});

describe("parseWorkbook: names", () => {
  it("collapses the many spellings of Old Ivy", () => {
    expect(canonicalOpponent("Old ivy")).toBe("Old Ivy");
    expect(canonicalOpponent("Oly Ivy")).toBe("Old Ivy");
    expect(canonicalOpponent("Old Ivy FC")).toBe("Old Ivy");
    expect(canonicalOpponent("  old   ivy  ")).toBe("Old Ivy");
    const spellings = new Set(data.matches.filter((m) => /ivy/i.test(m.opponent)).map((m) => m.opponent));
    expect([...spellings]).toEqual(["Old Ivy"]);
  });

  it("maps player aliases onto one person", () => {
    expect(canonicalName("Robin")).toBe("Robin Watson");
    expect(canonicalName("Eddie Ringer")).toBe("Eddie McLaughlin");
    const names = data.players.map((p) => p.name);
    expect(names).toContain("Robin Watson");
    expect(names).toContain("Eddie McLaughlin");
    expect(names).not.toContain("Robin");
    expect(names).not.toContain("Eddie Ringer");
  });

  it("leaves an unknown opponent alone (tidied)", () => {
    expect(canonicalOpponent("  Brand   New FC ")).toBe("Brand New FC");
  });
});

describe("parseWorkbook: what counts", () => {
  it("S7 GW3 is a forfeit and does not count for records", () => {
    const m = data.matches.find((x) => x.id === "s7-gw3")!;
    expect(m).toBeDefined();
    expect(m.type).toMatch(/friendly|forfeit/i);
    expect(m.countsForRecords).toBe(false);
    const s7 = data.seasons.find((s) => s.id === "S7")!;
    expect(s7.summary.played).toBe(s7.matches.filter((x) => x.played && x.countsForRecords).length);
    expect(s7.matches.filter((x) => x.played).length).toBeGreaterThan(s7.summary.played);
  });

  it("friendlies never count and never reach the league seasons", () => {
    for (const m of data.matches.filter((x) => x.seasonId === "FR")) { expect(m.countsForRecords).toBe(false); expect(m.type).toBe("Friendly"); }
    expect(data.seasons.some((s) => s.id === "FR")).toBe(false);
    for (const m of data.matches.filter((x) => x.type)) expect(m.countsForRecords).toBe(false);
    for (const p of data.players) for (const ps of p.seasons) expect(ps.seasonId).not.toBe("FR");
  });

  it("scorersRecorded is false only when goals were scored and nobody was credited", () => {
    for (const m of data.matches.filter((x) => x.played)) {
      const logged = m.lineup.reduce((t, l) => t + l.goals, 0);
      expect(m.scorersRecorded).toBe(m.ourGoals === 0 || logged > 0);
    }
  });
});

describe("parseWorkbook: money", () => {
  it("credits the pitch payer, leaving Isaac Mond owed money", () => {
    const isaac = data.money.rows.find((r) => r.player === "Isaac Mond")!;
    expect(isaac).toBeDefined();
    expect(isaac.pitchCovered).toBeGreaterThan(0);
    expect(isaac.balance).toBeLessThan(0);
    expect(isaac.paid).toBeGreaterThanOrEqual(isaac.pitchCovered);
  });

  it("every row balances: charged minus paid", () => {
    for (const r of data.money.rows) expect(r.balance).toBeCloseTo(r.totalCharged - r.paid, 2);
  });
});
