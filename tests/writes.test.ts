import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseWorkbook, lastParsedAliases, ALIASES, OPPONENTS } from "@/lib/sheet";
import { importClubData } from "@/lib/db-import";
import { loadClubData } from "@/lib/db-data";
import { addMember, addPlayer, applySubmission, deleteFixture, listMembers, pendingSubmissions, queueSubmission, recordPayment, recordScore, rejectSubmission, removeMember, updateProfile, upsertFixture, upsertSeason } from "@/lib/writes";
import type { Db } from "@/lib/db";
import { testDb } from "./db";

/** The write path against the real schema, seeded from the corrected workbook. */
let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await testDb());
  const buf = readFileSync("sheet-fixes/thameslink-hajduci-corrected.xlsx");
  const parsed = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const a = lastParsedAliases();
  await importClubData(db, parsed, { aliases: { ...ALIASES, ...a.players }, opponents: { ...OPPONENTS, ...a.opponents } });
});
afterAll(async () => { await close(); });

describe("recording results", () => {
  it("writes the score, line-up, scorers, assists and MOTM, and the stats follow", async () => {
    const before = await loadClubData(db);
    const fixture = before.seasons.find((s) => s.id === "S8")!.matches.find((m) => !m.played)!;
    const phil = before.players.find((p) => p.name === "Phil Knott")!;
    await recordScore({ matchId: fixture.id, ours: 4, theirs: 2, scorers: { "Phil Knott": 2, "Seb Burgess": 2 }, assists: { "Isaac Mond": 1 }, played: ["Phil Knott", "Seb Burgess", "Isaac Mond", "Max Cobain", "Ben Merrett"], motm: "Phil Knott", comment: "Comfortable" }, "test", db);
    const after = await loadClubData(db);
    const m = after.matches.find((x) => x.id === fixture.id)!;
    expect(m.played).toBe(true); expect(m.result).toBe("W"); expect(m.motm).toBe("Phil Knott"); expect(m.comment).toBe("Comfortable");
    expect(m.lineup.filter((l) => l.played).length).toBe(5);
    expect(m.lineup.find((l) => l.player === "Isaac Mond")!.assists).toBe(1);
    const philAfter = after.players.find((p) => p.name === "Phil Knott")!;
    expect(philAfter.apps).toBe(phil.apps + 1); expect(philAfter.goals).toBe(phil.goals + 2); expect(philAfter.motm).toBe(phil.motm + 1);
    // costs: the 79.95 pitch is now split five ways and Isaac, who paid, is owed more
    expect(m.costPerPlayer).toBeCloseTo(m.matchCost / 5, 6);
  });
  it("a correction replaces the earlier line-up rather than adding to it", async () => {
    const data = await loadClubData(db);
    const m = data.seasons.find((s) => s.id === "S8")!.matches.find((x) => x.comment === "Comfortable")!;
    await recordScore({ matchId: m.id, ours: 1, theirs: 2, scorers: { "Seb Burgess": 1 }, assists: {}, played: ["Seb Burgess", "Isaac Mond"], motm: null, comment: null }, "test", db);
    const after = (await loadClubData(db)).matches.find((x) => x.id === m.id)!;
    expect(after.result).toBe("L"); expect(after.lineup.length).toBe(2); expect(after.motm).toBeNull();
  });
});

describe("payments, players, profiles", () => {
  it("a payment reduces what the payer owes", async () => {
    const before = (await loadClubData(db)).money.rows.find((r) => r.player === "Ben Merrett")!;
    await recordPayment({ player: "Ben Merrett", to: "Isaac Mond", amount: 5, date: "2026-09-04", note: "half" }, "test", db);
    const after = (await loadClubData(db)).money.rows.find((r) => r.player === "Ben Merrett")!;
    expect(after.balance).toBeCloseTo(before.balance - 5, 6);
    expect((await loadClubData(db)).money.payments.at(-1)).toMatchObject({ player: "Ben Merrett", to: "Isaac Mond", amount: 5, note: "half" });
  });
  it("a new player joins the current season's team sheet", async () => {
    await addPlayer({ name: "Tom Smith", nickname: "Smudger", positions: ["DEF"], shirt: 77, photo: "", seasonId: "S8" }, "test", db);
    const data = await loadClubData(db);
    expect(data.seasons.find((s) => s.id === "S8")!.players).toContain("Tom Smith");
    await recordScore({ matchId: data.seasons.find((s) => s.id === "S8")!.matches.find((m) => !m.played)!.id, ours: 1, theirs: 0, scorers: { "Tom Smith": 1 }, assists: {}, played: ["Tom Smith"], motm: null, comment: null }, "test", db);
    const tom = (await loadClubData(db)).players.find((p) => p.name === "Tom Smith")!;
    expect(tom.goals).toBe(1); expect(tom.extra.shirt).toBe(77); expect(tom.extra.nickname).toBe("Smudger");
  });
  it("a profile edit changes only what was given", async () => {
    await updateProfile("Phil Knott", { bio: "Never misses a Tuesday.", shirt: 4 }, "phil@test", db);
    const phil = (await loadClubData(db)).players.find((p) => p.name === "Phil Knott")!;
    expect(phil.extra.bio).toBe("Never misses a Tuesday."); expect(phil.extra.shirt).toBe(4); expect(phil.extra.positions?.length).toBeGreaterThan(0);
  });
});

describe("members, seasons, fixtures, the queue", () => {
  it("adds and removes a member address", async () => {
    await addMember("MaxCobain@live.com", "Max Cobain", false, "isaac", db);
    expect((await listMembers(db)).find((m) => m.email === "maxcobain@live.com")?.player).toBe("Max Cobain");
    await removeMember("maxcobain@live.com", db);
    expect((await listMembers(db)).some((m) => m.email === "maxcobain@live.com")).toBe(false);
  });
  it("creates a season and fixtures, with the season's pitch cost as the default", async () => {
    await upsertSeason({ id: "S9", number: 9, title: "Season 9 · Old Street · Jan–Apr 2027", venue: "Old Street", period: "Jan–Apr 2027", pitchCost: 81.5, paidBy: "Isaac Mond", seasonCost: 0 }, db);
    const id = await upsertFixture({ seasonId: "S9", gw: 1, date: "2027-01-05", kickOff: "20:15", opponent: "Old Ivy", type: null, matchCost: null }, "isaac", db);
    expect(id).toBe("s9-gw1");
    const data = await loadClubData(db);
    expect(data.matches.find((m) => m.id === "s9-gw1")).toMatchObject({ opponent: "Old Ivy", matchCost: 81.5, played: false });
    await deleteFixture("s9-gw1", db);
    expect((await loadClubData(db)).matches.some((m) => m.id === "s9-gw1")).toBe(false);
  });
  it("queues an anonymous payment, then applying it records it once", async () => {
    const id = await queueSubmission("payment", { player: "Finn Cawley", to: "Isaac Mond", amount: 11.42, date: "2026-09-04", note: "" }, "Finn Cawley paid £11.42", "Finn", db);
    expect((await pendingSubmissions(db)).map((s) => s.id)).toContain(id);
    const done = await applySubmission(id, "Isaac Mond", db);
    expect(done?.kind).toBe("payment");
    expect(await applySubmission(id, "Isaac Mond", db)).toBeNull();
    const finn = (await loadClubData(db)).money.rows.find((r) => r.player === "Finn Cawley")!;
    expect(finn.paid).toBeCloseTo(11.42, 6);
    const other = await queueSubmission("player", { name: "Nope Nobody", nickname: "", positions: [], shirt: null, photo: "", seasonId: "S8" }, "New player: Nope Nobody", "Anon", db);
    await rejectSubmission(other, "Isaac Mond", db);
    expect((await pendingSubmissions(db)).length).toBe(0);
    expect((await loadClubData(db)).players.some((p) => p.name === "Nope Nobody")).toBe(false);
  });
});
