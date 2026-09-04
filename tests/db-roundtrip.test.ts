import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseWorkbook, lastParsedAliases, ALIASES, OPPONENTS } from "@/lib/sheet";
import { importClubData } from "@/lib/db-import";
import { loadClubData } from "@/lib/db-data";
import type { Db } from "@/lib/db";
import type { ClubData } from "@/lib/types";
import { fixtureWorkbook } from "./helpers";
import { testDb } from "./db";

/** The database must reproduce what the sheet parser produced, stat for stat, or the migration changes the site. */
let db: Db;
let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await testDb()); });
afterAll(async () => { await close(); });

const strip = (d: ClubData) => {
  const { fetchedAt: _f, sheetUrl: _u, ...rest } = d; void _f; void _u;
  const seasons = [...rest.seasons, ...(rest.friendlies ? [rest.friendlies] : [])].map((s) => ({ ...s, summary: { ...s.summary, topScorer: undefined, mostApps: undefined } }));
  const money = { paidBy: rest.money.paidBy, payments: rest.money.payments, rows: rest.money.rows.filter((r) => r.totalCharged > 0.001 || r.paid > 0.001 || Math.abs(r.balance) > 0.001).map((r) => ({ ...r, charges: Object.fromEntries(Object.entries(r.charges).filter(([, v]) => v !== 0)) })).sort((a, b) => a.player.localeCompare(b.player)) };
  return { seasons, matches: rest.matches, players: rest.players, money, allTime: { ...rest.allTime, topScorer: undefined, mostApps: undefined } };
};
const round = (x: unknown): unknown => typeof x === "number" ? Math.round(x * 1000) / 1000 : Array.isArray(x) ? x.map(round) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, v]) => [k, round(v)])) : x;

async function roundTrip(buf: ArrayBuffer) {
  const parsed = parseWorkbook(buf);
  const aliases = lastParsedAliases();
  const counts = await importClubData(db, parsed, { aliases: { ...ALIASES, ...aliases.players }, opponents: { ...OPPONENTS, ...aliases.opponents } });
  const loaded = await loadClubData(db);
  return { parsed, loaded, counts };
}

describe("sheet → database → ClubData", () => {
  it("reproduces the synthetic fixture exactly", async () => {
    const { parsed, loaded, counts } = await roundTrip(fixtureWorkbook());
    expect(counts.matches).toBeGreaterThan(0);
    expect(round(strip(loaded))).toEqual(round(strip(parsed)));
  });
  it("reproduces the real corrected workbook: every player, match and record (costs are formulas there, so money is checked separately)", async () => {
    const buf = readFileSync("sheet-fixes/thameslink-hajduci-corrected.xlsx");
    const { parsed, loaded, counts } = await roundTrip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(counts.matches).toBe(parsed.matches.length);
    expect(loaded.players.map((p) => [p.name, p.apps, p.goals, p.assists, p.motm, p.wins, p.draws, p.losses])).toEqual(parsed.players.map((p) => [p.name, p.apps, p.goals, p.assists, p.motm, p.wins, p.draws, p.losses]));
    // The corrected file stores "Cost per player", "Season cost" and the Money tab as formulas without cached values, so the parser
    // sees 0 where the database computes the figures. Compare everything else, then check the split the way the live sheet shows it.
    const noCost = (d: ReturnType<typeof strip>) => ({ ...d, allTime: { ...d.allTime, seasonCost: 0 }, seasons: d.seasons.map((s) => ({ ...s, summary: { ...s.summary, seasonCost: 0 }, matches: s.matches.map((m) => ({ ...m, costPerPlayer: 0, lineup: m.lineup.map((l) => ({ ...l, cost: 0 })) })) })), matches: d.matches.map((m) => ({ ...m, costPerPlayer: 0, lineup: m.lineup.map((l) => ({ ...l, cost: 0 })) })), players: d.players.map((p) => ({ ...p, seasons: p.seasons.map((x) => ({ ...x, cost: 0 })) })), money: null });
    expect(round(noCost(strip(loaded)))).toEqual(round(noCost(strip(parsed))));
    const s8 = loaded.seasons.find((s) => s.id === "S8")!;
    const game = s8.matches.find((m) => m.played && m.matchCost > 0)!;
    expect(game.costPerPlayer).toBeCloseTo(game.matchCost / game.lineup.filter((l) => l.played).length, 6);
    const isaac = loaded.money.rows.find((r) => r.player === "Isaac Mond")!;
    expect(isaac.pitchCovered).toBeCloseTo(s8.matches.filter((m) => m.played).reduce((t, m) => t + m.matchCost, 0), 6);
    expect(isaac.balance).toBeCloseTo(isaac.totalCharged - isaac.pitchCovered, 6);
    for (const r of loaded.money.rows.filter((r) => r.player !== "Isaac Mond" && r.totalCharged > 0)) expect(r.balance).toBeCloseTo(r.totalCharged, 6);
  });
});
