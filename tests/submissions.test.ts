import { describe, expect, it } from "vitest";
import { buildPaymentMessage, buildPlayerMessage, buildScoreMessage, rosterName, validatePayment, validatePlayer, validateScore } from "@/lib/submissions";

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
  it("builds a message that says what was owed and what is left, and a change that names the recipient", () => {
    const v = { player: "Phil Knott", to: null, amount: 10, date: "2026-09-03", note: "", submittedBy: "Phil" };
    const m = buildPaymentMessage(v, { payer: "Isaac Mond", balance: 11.42 });
    expect(m.summary).toBe("Phil Knott paid £10.00 to Isaac Mond · Thu, 3 Sept 2026");
    expect(m.text).toContain("Owed before this: £11.42 → £1.42 still to pay");
    expect(m.text).toContain("From Phil Knott to Isaac Mond");
    expect(m.subject).toMatch(/^Payment: /);
    expect(m.change).toEqual({ player: "Phil Knott", to: "Isaac Mond", amount: 10, date: "2026-09-03", note: "" });
  });
  it("flags a recipient who is not the season's pitch payer", () => {
    const base = { player: "Phil Knott", amount: 10, date: today, note: "", submittedBy: "Phil" };
    const ctx = { payer: "Isaac Mond", balance: null };
    expect(buildPaymentMessage({ ...base, to: "Isaac Mond" }, ctx).text).not.toContain("pitch payer");
    const other = buildPaymentMessage({ ...base, to: "Seb Burgess" }, ctx);
    expect(other.summary).toContain("paid £10.00 to Seb Burgess");
    expect(other.text).toContain("From Phil Knott to Seb Burgess (not Isaac Mond, who is down as this season's pitch payer; check who should be credited)");
  });
  it("flags a payment from someone who owed nothing", () => {
    const m = buildPaymentMessage({ player: "Seb Burgess", to: null, amount: 5, date: today, note: "", submittedBy: "Seb" }, { payer: null, balance: -3 });
    expect(m.text).toContain("Nothing was outstanding for Seb Burgess (already £3.00 in credit). Check this one.");
    expect(m.change.to).toBeNull();
  });
});

describe("scores", () => {
  const known = (n: string) => roster.includes(n);
  const fixture = { id: "s8-gw2", seasonId: "S8", gw: 2, opponent: "Inter Islington", date: "2026-09-08", played: false };
  it("accepts a result with scorers, assists and a line-up", () => {
    const r = validateScore({ ours: 3, theirs: 1, scorers: { "Seb Burgess": 2, "Phil Knott": 1 }, assists: { "Isaac Mond": 1 }, played: ["Isaac Mond"], motm: "Seb Burgess", submittedBy: "Phil", note: "Late winner" }, known);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.played.sort()).toEqual(["Isaac Mond", "Phil Knott", "Seb Burgess"]);
    const m = buildScoreMessage(r.value, fixture, "Tue 8 Sept");
    expect(m.summary).toBe("Hajduci 3–1 Inter Islington · S8 GW2 · Tue 8 Sept");
    expect(m.text).toContain("Scorers: Seb Burgess ×2, Phil Knott");
    expect(m.text).toContain("MOTM: Seb Burgess");
    expect(m.change).toMatchObject({ matchId: "s8-gw2", ours: 3, theirs: 1, motm: "Seb Burgess", comment: "Late winner", scorers: { "Seb Burgess": 2, "Phil Knott": 1 } });
  });
  it.each([
    [{ ours: 3.5, theirs: 1, submittedBy: "Me" }, /whole numbers/],
    [{ ours: 1, theirs: 1, scorers: { "Seb Burgess": 2 }, submittedBy: "Me" }, /add up to 2/],
    [{ ours: 1, theirs: 1, assists: { "Seb Burgess": 2 }, submittedBy: "Me" }, /More assists/],
    [{ ours: 1, theirs: 1, scorers: { Stranger: 1 }, submittedBy: "Me" }, /Not on the roster: Stranger/],
    [{ ours: 1, theirs: 1, submittedBy: "" }, /who you are/],
  ])("rejects %j", (body, msg) => {
    const r = validateScore(body as Record<string, unknown>, known);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
  it("marks a correction when the fixture already has a score", () => {
    const r = validateScore({ ours: 0, theirs: 2, submittedBy: "Phil" }, known);
    expect(r.ok && buildScoreMessage(r.value, { ...fixture, played: true }, "Tue").text.startsWith("SCORE (correction)")).toBe(true);
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
  it("builds a message and a change that joins the current season", () => {
    const v = { name: "Tom Smith", nickname: "Smudger", positions: ["DEF" as const], shirt: 7, photo: "", note: "", submittedBy: "Isaac" };
    const m = buildPlayerMessage(v, { seasonId: "S8" });
    expect(m.summary).toBe("New player: Tom Smith (#7) · joins for S8");
    expect(m.text).toContain("Nickname: Smudger");
    expect(m.change).toEqual({ name: "Tom Smith", nickname: "Smudger", positions: ["DEF"], shirt: 7, photo: "", seasonId: "S8" });
  });
});

describe("helpers", () => {
  it("matches roster names loosely but returns the roster spelling", () => {
    expect(rosterName("  isaac   mond ", roster)).toBe("Isaac Mond");
    expect(rosterName("Isaac", roster)).toBeNull();
  });
});
