import { describe, expect, it } from "vitest";
import { a1, colLetter, planSquadRow, toValueRanges } from "@/lib/sheet-edits";

describe("A1 ranges", () => {
  it("adds the default tab to bare cells and keeps explicit tabs", () => {
    expect(a1("F5", "S8")).toBe("'S8'!F5");
    expect(a1("f5", "S8")).toBe("'S8'!F5");
    expect(a1("Money!A12", "S8")).toBe("'Money'!A12");
    expect(a1("'All-time'!A9", null)).toBe("'All-time'!A9");
  });
  it("escapes quotes in tab names and refuses nonsense", () => {
    expect(a1("B2", "Phil's tab")).toBe("'Phil''s tab'!B2");
    expect(() => a1("F5", null)).toThrow(/No tab/);
    expect(() => a1("=SUM(A1)", "S8")).toThrow(/Not a cell/);
  });
  it("turns edits into one value range each", () => {
    expect(toValueRanges([{ cell: "A3", value: "2026-09-04", what: "Date" }, { cell: "C3", value: 1, what: "Amount" }], "Payments")).toEqual([
      { range: "'Payments'!A3", values: [["2026-09-04"]] }, { range: "'Payments'!C3", values: [[1]] },
    ]);
  });
  it("numbers columns like a spreadsheet", () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(colLetter)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
});

describe("Squad row planning", () => {
  const header = ["Player", "Nickname", "Position", "Shirt", "Photo", "Bio", "Updated"];
  it("updates the player's existing row in place, only for the fields given", () => {
    const grid = [header, ["Phil Knott", "Knotty", "DEF", 10, "", "", ""], ["Seb Burgess", "", "FWD", 9, "", "", ""]];
    const edits = planSquadRow(grid, "phil knott", { nickname: "The Wall", shirt: 4 }, "now", (s) => s.toLowerCase());
    expect(edits).toEqual([
      { cell: "B2", value: "The Wall", what: "Nickname" },
      { cell: "D2", value: 4, what: "Shirt" },
      { cell: "G2", value: "now", what: "Updated" },
    ]);
  });
  it("takes the first free row for a new player and writes the name", () => {
    const grid = [header, ["Phil Knott", "", "", "", "", "", ""]];
    const edits = planSquadRow(grid, "Isaac Mond", { positions: ["MID", "FWD"], bio: "Runs the tab.", photo: "https://x/y.jpg" }, "now");
    expect(edits[0]).toEqual({ cell: "A3", value: "Isaac Mond", what: "Player" });
    expect(edits).toContainEqual({ cell: "C3", value: "MID/FWD", what: "Position" });
    expect(edits).toContainEqual({ cell: "E3", value: "https://x/y.jpg", what: "Photo" });
    expect(edits).toContainEqual({ cell: "F3", value: "Runs the tab.", what: "Bio" });
  });
  it("clears a field with an empty string and nulls a shirt", () => {
    const grid = [header, ["Phil Knott", "Knotty", "DEF", 10, "https://old", "", ""]];
    const edits = planSquadRow(grid, "Phil Knott", { photo: "", shirt: null }, "now");
    expect(edits).toContainEqual({ cell: "E2", value: "", what: "Photo" });
    expect(edits).toContainEqual({ cell: "D2", value: "", what: "Shirt" });
  });
  it("creates the header on an empty tab and adds missing columns to the right", () => {
    expect(planSquadRow([], "Phil Knott", { nickname: "K" }, "now").slice(0, 7).map((e) => e.value)).toEqual(header);
    const narrow = [["Player", "Shirt"], ["Phil Knott", 10]];
    const edits = planSquadRow(narrow, "Phil Knott", { nickname: "K" }, "now");
    expect(edits).toContainEqual({ cell: "C1", value: "Nickname", what: "header" });
    expect(edits).toContainEqual({ cell: "D1", value: "Updated", what: "header" });
    expect(edits).toContainEqual({ cell: "C2", value: "K", what: "Nickname" });
  });
});
