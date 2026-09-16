import { describe, expect, it } from "vitest";
import { ordinal, pollDay, pollMessage, pollQuestion } from "@/lib/poll";

describe("the who's-in poll", () => {
  it("writes the question the way the group chat always sees it", () => {
    expect(pollQuestion({ opponent: "TMHLR F.C.", date: "2026-09-15", kickOff: "18:15" })).toBe("Thameslink Hajduci v TMHLR F.C. - 18:15, 15th September");
  });
  it("leaves out what the fixture does not have yet", () => {
    expect(pollQuestion({ opponent: "Heavy MWEtal Football", date: "2026-09-22", kickOff: null })).toBe("Thameslink Hajduci v Heavy MWEtal Football - 22nd September");
    expect(pollQuestion({ opponent: "TBC", date: null, kickOff: null })).toBe("Thameslink Hajduci v TBC");
  });
  it("gets the ordinals right, including the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"]);
    expect(pollDay("2026-12-01")).toBe("1st December");
    expect(pollDay("nonsense")).toBeNull();
  });
  it("has a plain-message fallback with the two answers", () => {
    expect(pollMessage({ opponent: "Inter Islington", date: "2026-11-10", kickOff: "20:15" })).toBe("Thameslink Hajduci v Inter Islington - 20:15, 10th November\nIn or Out?");
  });
});
