import { describe, expect, it } from "vitest";
import { buildPaymentMessage, buildPlayerMessage, editsLine, rosterName, validatePayment, validatePlayer } from "@/lib/submissions";

const roster = ["Phil Knott", "Seb Burgess", "Isaac Mond"];
const today = "2026-09-04";

describe("payments", () => {
  it("accepts a sensible payment and normalises the amount", () => {
    const r = validatePayment({ player: "phil knott", amount: "11.42", date: "2026-09-03", submittedBy: "Phil", note: "Monzo ref 123" }, roster, today);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.player).toBe("Phil Knott"); expect(r.value.amount).toBe(11.42); expect(r.value.note).toBe("Monzo ref 123"); expect(r.value.to).toBeNull(); }
  });
  it("records who was paid, matched against the roster", () => {
    const r = validatePayment({ player: "Phil Knott", to: "isaac mond", amount: 5, date: today, submittedBy: "Phil" }, roster, today);
    expect(r.ok && r.value.to).toBe("Isaac Mond");
  });
  it("rounds to pennies and strips pound signs", () => {
    const r = validatePayment({ player: "Phil Knott", amount: "£ 12.345", date: today, submittedBy: "Phil" }, roster, today);
    expect(r.ok && r.value.amount).toBe(12.35);
  });
  it.each([
    [{ player: "Nobody", amount: 5, date: today, submittedBy: "Me" }, /Pick a player/],
    [{ player: "Phil Knott", amount: 0, date: today, submittedBy: "Me" }, /penny/],
    [{ player: "Phil Knott", amount: 501, date: today, submittedBy: "Me" }, /more than anyone owes/],
    [{ player: "Phil Knott", amount: "lots", date: today, submittedBy: "Me" }, /amount in pounds/],
    [{ player: "Phil Knott", amount: 5, date: "2026-09-05", submittedBy: "Me" }, /future/],
    [{ player: "Phil Knott", amount: 5, date: "2025-01-01", submittedBy: "Me" }, /more than a year/],
    [{ player: "Phil Knott", amount: 5, date: "2026-02-30", submittedBy: "Me" }, /date you paid/],
    [{ player: "Phil Knott", amount: 5, date: today, submittedBy: "X" }, /who you are/],
    [{ player: "Phil Knott", to: "Nobody", amount: 5, date: today, submittedBy: "Me" }, /who was paid/],
    [{ player: "Phil Knott", to: "Phil Knott", amount: 5, date: today, submittedBy: "Me" }, /yourself/],
  ])("rejects %j", (body, msg) => {
    const r = validatePayment(body as Record<string, unknown>, roster, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
  it("builds a message that says what was owed and what is left", () => {
    const v = { player: "Phil Knott", to: null, amount: 10, date: "2026-09-03", note: "", submittedBy: "Phil" };
    const edits = [{ cell: "A3", value: "2026-09-03", what: "Date" }, { cell: "C3", value: 10, what: "Amount (£)" }];
    const m = buildPaymentMessage(v, { payer: "Isaac Mond", balance: 11.42, edits, tab: "Payments", sheetUrl: "https://sheet" });
    expect(m.summary).toBe("Phil Knott paid £10.00 to Isaac Mond · Thu, 3 Sept 2026");
    expect(m.text).toContain("Owed before this: £11.42 → £1.42 still to pay");
    expect(m.text).toContain('Sheet edits (tab Payments): A3="2026-09-03", C3=10');
    expect(m.subject).toMatch(/^Payment: /);
    expect(m.text).toContain("From Phil Knott to Isaac Mond");
  });
  it("names the recipient and flags one who is not the season's pitch payer", () => {
    const base = { player: "Phil Knott", amount: 10, date: today, note: "", submittedBy: "Phil" };
    const ctx = { payer: "Isaac Mond", balance: null, edits: [], tab: null, sheetUrl: "u" };
    const same = buildPaymentMessage({ ...base, to: "Isaac Mond" }, ctx);
    expect(same.summary).toContain("paid £10.00 to Isaac Mond");
    expect(same.text).not.toContain("pitch payer");
    const other = buildPaymentMessage({ ...base, to: "Seb Burgess" }, ctx);
    expect(other.summary).toContain("paid £10.00 to Seb Burgess");
    expect(other.text).toContain("From Phil Knott to Seb Burgess (not Isaac Mond, who is down as this season's pitch payer; check who should be credited)");
  });
  it("flags a payment from someone who owed nothing", () => {
    const m = buildPaymentMessage({ player: "Seb Burgess", to: null, amount: 5, date: today, note: "", submittedBy: "Seb" }, { payer: null, balance: -3, edits: [], tab: null, sheetUrl: "u" });
    expect(m.text).toContain("Nothing was outstanding for Seb Burgess (already £3.00 in credit). Check this one.");
    expect(m.text).toContain("could not map cells");
  });
});

describe("new players", () => {
  const shirts = new Map([[10, "Phil Knott"]]);
  it("accepts a new name with positions and a free shirt", () => {
    const r = validatePlayer({ name: "  Tom   O'Neill ", positions: ["fwd", "MID"], shirt: "7", photo: "https://example.com/tom.jpg", submittedBy: "Isaac" }, roster, shirts);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.name).toBe("Tom O'Neill"); expect(r.value.positions).toEqual(["MID", "FWD"]); expect(r.value.shirt).toBe(7); }
  });
  it.each([
    [{ name: "T", submittedBy: "Me" }, /name/],
    [{ name: "Tom", submittedBy: "Me" }, /First name and surname/],
    [{ name: "phil KNOTT", submittedBy: "Me" }, /already in the squad/],
    [{ name: "Tom Smith", shirt: 10, submittedBy: "Me" }, /Phil Knott's shirt/],
    [{ name: "Tom Smith", shirt: 100, submittedBy: "Me" }, /1 to 99/],
    [{ name: "Tom Smith", positions: ["CB"], submittedBy: "Me" }, /GK, DEF, MID or FWD/],
    [{ name: "Tom Smith", photo: "http://insecure/x.jpg", submittedBy: "Me" }, /https/],
    [{ name: "=HYPERLINK(1)", submittedBy: "Me" }, /letters/],
    [{ name: "Tom Smith", submittedBy: "" }, /who you are/],
  ])("rejects %j", (body, msg) => {
    const r = validatePlayer(body as Record<string, unknown>, roster, shirts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
  it("builds a message listing every tab to touch", () => {
    const v = { name: "Tom Smith", nickname: "Smudger", positions: ["DEF" as const], shirt: 7, photo: "", note: "", submittedBy: "Isaac" };
    const edits = [{ cell: "S8!A40", value: "Tom Smith", what: "roster" }, { cell: "All-time!A25", value: "Tom Smith", what: "all-time" }];
    const m = buildPlayerMessage(v, { seasonId: "S8", edits, warnings: ["Money: no free row above Total. Insert one, then add the name."], sheetUrl: "u" });
    expect(m.summary).toBe("New player: Tom Smith (#7) · joins for S8");
    expect(m.text).toContain('Sheet edits: S8!A40="Tom Smith", All-time!A25="Tom Smith"');
    expect(m.text).toContain("Money: no free row above Total");
    expect(m.text).toContain("Nickname: Smudger");
  });
});

describe("helpers", () => {
  it("matches roster names loosely but returns the roster spelling", () => {
    expect(rosterName("  isaac   mond ", roster)).toBe("Isaac Mond");
    expect(rosterName("Isaac", roster)).toBeNull();
  });
  it("quotes strings and leaves numbers bare in the edits line", () => {
    expect(editsLine([{ cell: "B4", value: "x", what: "" }, { cell: "C4", value: 2, what: "" }], "S8")).toBe('Sheet edits (tab S8): B4="x", C4=2');
  });
});
