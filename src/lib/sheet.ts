import * as XLSX from "xlsx";
import { cache } from "react";
import { slugify } from "./slug";
import type { ClubData, Match, MoneyRow, Payment, PlayerMatchLine, Result, Season, SeasonSummary, SquadExtra } from "./types";
import { assembleClubData, mergeExtras, rejectedPhotos, safePhoto } from "./assemble";

import { SHEET_ID as PUBLIC_SHEET_ID, SHEET_URL } from "./config";
import { londonToday } from "./time";
import { log } from "./log";
/** Server-only override wins, then the public id. */
export const SHEET_ID = process.env.SHEET_ID ?? PUBLIC_SHEET_ID;
export { SHEET_URL };
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

/** Names that refer to the same person in the sheet vs the old app. */
export const ALIASES: Record<string, string> = {
  Robin: "Robin Watson",
  Seb: "Seb Burgess",
  "Eddie Ringer": "Eddie McLaughlin",
  "Jake Hamilton": "Jake Ringer",
  "Jacob Hamilton": "Jake Ringer",
};

/** The sheet spells opponents many ways; collapse them so head-to-head records line up. Keys are lower-case, punctuation-free. */
export const OPPONENTS: Record<string, string> = {
  "enjoy": "Enjoy Your Mane Jane", "enjoy your mane": "Enjoy Your Mane Jane", "enjoy your mane jane": "Enjoy Your Mane Jane", "mane jane": "Enjoy Your Mane Jane",
  "old ivy": "Old Ivy", "old ivy fc": "Old Ivy", "oly ivy": "Old Ivy",
  "britannias": "The Britannias", "the britannias": "The Britannias",
  "ding cats": "Ding Cats", "dingcats": "Ding Cats", "dign cats": "Ding Cats",
  "dukes": "Dukes Select", "dukes select": "Dukes Select",
  "dalston": "Dalston Eagles", "dalston eagles": "Dalston Eagles",
  "spudos": "Spudos", "spudos fc": "Spudos",
  "not very often": "Not Very Often",
  "cottesmore": "Cottesmore FC", "cottesmore fc": "Cottesmore FC",
  "xzr fc": "XZR FC", "xzr": "XZR FC",
  "green of the south": "Green of the South", "vauban fc": "Vauban FC", "refs mates": "Ref's Mates", "ref s mates": "Ref's Mates",
};
export function canonicalOpponent(raw: string) {
  const n = raw.trim().replace(/\s+/g, " ");
  const key = n.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return sheetOpponents[key] ?? OPPONENTS[key] ?? n;
}

type Cell = string | number | boolean | Date | null | undefined;
type Grid = Cell[][];

export { slugify };

function str(c: Cell): string | null {
  if (c === null || c === undefined) return null;
  if (c instanceof Date) return c.toISOString();
  const s = String(c).trim();
  return s.length ? s : null;
}
function num(c: Cell): number | null {
  if (c === null || c === undefined || c === "") return null;
  if (typeof c === "number") return isFinite(c) ? c : null;
  const n = Number(String(c).replace(/[£,]/g, ""));
  return isFinite(n) ? n : null;
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function isoDate(c: Cell): string | null {
  if (c instanceof Date) {
    if (c.getFullYear() < 1905) return null; // a bare time-of-day
    return `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`;
  }
  if (typeof c === "number") {
    const d = XLSX.SSF.parse_date_code(c);
    if (!d || d.y < 1905) return null;
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  if (typeof c === "string") {
    const m = c.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
    const t = Date.parse(c);
    if (!isNaN(t)) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  }
  return null;
}
function timeOfDay(c: Cell): string | null {
  if (c instanceof Date) return `${pad(c.getHours())}:${pad(c.getMinutes())}`;
  if (typeof c === "number") {
    const frac = c - Math.floor(c);
    const mins = Math.round(frac * 24 * 60);
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  }
  if (typeof c === "string") { const m = c.match(/(\d{1,2}):(\d{2})/); if (m) return `${pad(+m[1])}:${m[2]}`; }
  return null;
}
/** Extra aliases from an optional "Aliases" tab (columns From, To); merged over the built-in map before each parse. */
let sheetAliases: Record<string, string> = {};
let sheetOpponents: Record<string, string> = {};
/** Alias maps read from the workbook on the last parse (Aliases / Opponents tabs), for the one-off import into the database. */
export const lastParsedAliases = () => ({ players: { ...sheetAliases }, opponents: { ...sheetOpponents } });
export function canonicalName(raw: string) {
  const n = raw.trim().replace(/\s+/g, " ");
  return sheetAliases[n] ?? ALIASES[n] ?? n;
}
function parseAliasTab(grid: Grid): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of grid) { const from = str(row?.[0]), to = str(row?.[1]); if (from && to && !/^(from|spelling)$/i.test(from)) out[from.replace(/\s+/g, " ")] = to.replace(/\s+/g, " "); }
  return out;
}

function sheetToGrid(ws: XLSX.WorkSheet): Grid {
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
}
function findRow(grid: Grid, label: string | RegExp, from = 0): number {
  for (let r = from; r < grid.length; r++) {
    const v = str(grid[r]?.[0]);
    if (!v) continue;
    if (typeof label === "string" ? v.toLowerCase().startsWith(label.toLowerCase()) : label.test(v)) return r;
  }
  return -1;
}

/** Parse the player grid that starts at `headerRow` and runs until a row whose first cell is "Total". */
function parsePlayerGrid(grid: Grid, headerRow: number, gwCols: number[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  if (headerRow < 0) return out;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const name = str(grid[r]?.[0]);
    if (name && name.toLowerCase() === "total") break;
    if (!name) continue;
    out.set(canonicalName(name), gwCols.map((c) => num(grid[r][c]) ?? 0));
  }
  return out;
}

function parseSeasonTab(id: string, grid: Grid, opts: { friendlies?: boolean } = {}): Season | null {
  const title = str(grid[0]?.[0]) ?? id;
  const number = opts.friendlies ? 0 : Number(id.slice(1));
  const matchRow = findRow(grid, "Match");
  if (matchRow < 0) return null;
  const header = grid[matchRow];
  const gwCols: number[] = [];
  header.forEach((c, i) => { if (typeof c === "string" && /^(GW|Game|G|F|Friendly)\s*\d+$/i.test(c.trim())) gwCols.push(i); });
  const summaryCol = header.findIndex((c) => typeof c === "string" && /season summary/i.test(c));

  const row = (label: string) => { const r = findRow(grid, label, matchRow); return r >= 0 ? grid[r] : []; };
  const dates = row("Date"), kos = row("Kick-off"), opps = row("Opponent"), ours = row("Our goals"),
    theirs = row("Their goals"), results = row("Result"), motms = row("MOTM"),
    comments = row("Comments"), costs = row("Match cost"), pig = row("Players in game"), cpp = row("Cost per player"),
    types = row("Type");

  const apps = parsePlayerGrid(grid, findRow(grid, "APPEARANCES"), gwCols);
  const goals = parsePlayerGrid(grid, findRow(grid, /^GOALS/), gwCols);
  const assists = parsePlayerGrid(grid, findRow(grid, /^ASSISTS/), gwCols);
  const roster = [...apps.keys()];

  const matches: Match[] = [];
  gwCols.forEach((col, gi) => {
    const rawOpponent = str(opps[col]);
    const opponent = rawOpponent ? canonicalOpponent(rawOpponent) : null;
    const date = isoDate(dates[col]);
    if (!opponent && !date) return;
    const og = num(ours[col]), tg = num(theirs[col]);
    const played = og !== null && tg !== null;
    let result: Result | null = null;
    const rr = str(results[col]);
    if (rr && /^[WDL]$/i.test(rr)) result = rr.toUpperCase() as Result;
    else if (played) result = og! > tg! ? "W" : og! < tg! ? "L" : "D";
    const type = str(types[col]) ?? (opts.friendlies ? "Friendly" : null);
    const lineup: PlayerMatchLine[] = [];
    for (const p of roster) {
      const pl = (apps.get(p)?.[gi] ?? 0) > 0;
      const g = goals.get(p)?.[gi] ?? 0;
      const a = assists.get(p)?.[gi] ?? 0;
      if (pl || g || a) lineup.push({ player: p, played: pl || g > 0, goals: g, assists: a, cost: pl ? (num(cpp[col]) ?? 0) : 0 });
    }
    const goalsLogged = lineup.reduce((t, l) => t + l.goals, 0);
    const assistsLogged = lineup.reduce((t, l) => t + l.assists, 0);
    matches.push({
      id: `${id.toLowerCase()}-gw${gi + 1}`,
      seasonId: id, seasonNumber: number, gw: gi + 1, date,
      kickOff: timeOfDay(kos[col]),
      opponent: opponent ?? "TBC",
      ourGoals: og, theirGoals: tg, result, played,
      motm: str(motms[col]) ? canonicalName(str(motms[col])!) : null,
      comment: str(comments[col]),
      type,
      countsForRecords: !type && !opts.friendlies,
      scorersRecorded: og === 0 || goalsLogged > 0,
      assistsRecorded: og === 0 || assistsLogged > 0,
      matchCost: num(costs[col]) ?? 0,
      playersInGame: num(pig[col]) ?? lineup.filter((l) => l.played).length,
      costPerPlayer: num(cpp[col]) ?? 0,
      lineup,
    });
  });

  // Season summary block (label in summaryCol, value in summaryCol+1)
  const summary: SeasonSummary = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, topScorer: null, mostApps: null, seasonCost: 0, paidBy: null };
  if (summaryCol >= 0) {
    for (let r = matchRow; r < Math.min(grid.length, matchRow + 20); r++) {
      const k = str(grid[r]?.[summaryCol])?.toLowerCase();
      const v = grid[r]?.[summaryCol + 1];
      if (!k) continue;
      if (k === "played") summary.played = num(v) ?? 0;
      else if (k === "won") summary.won = num(v) ?? 0;
      else if (k === "drawn") summary.drawn = num(v) ?? 0;
      else if (k === "lost") summary.lost = num(v) ?? 0;
      else if (k === "goals for") summary.goalsFor = num(v) ?? 0;
      else if (k === "goals against") summary.goalsAgainst = num(v) ?? 0;
      else if (k === "top scorer") summary.topScorer = str(v);
      else if (k === "most apps") summary.mostApps = str(v);
      else if (k === "season cost") summary.seasonCost = num(v) ?? 0;
      else if (k === "paid by") summary.paidBy = str(v) ? canonicalName(str(v)!) : null;
    }
  }
  // Recompute W/D/L from counted matches so the site never disagrees with itself.
  const counted = matches.filter((m) => m.countsForRecords && m.played);
  summary.played = counted.length;
  summary.won = counted.filter((m) => m.result === "W").length;
  summary.drawn = counted.filter((m) => m.result === "D").length;
  summary.lost = counted.filter((m) => m.result === "L").length;
  summary.goalsFor = counted.reduce((s, m) => s + (m.ourGoals ?? 0), 0);
  summary.goalsAgainst = counted.reduce((s, m) => s + (m.theirGoals ?? 0), 0);

  const parts = title.split("·").map((s) => s.trim());
  const today = londonToday();
  const future = matches.filter((m) => !m.played && m.date && m.date >= today);
  return {
    id, number, title,
    venue: parts[1] ?? "",
    period: parts[2] ?? "",
    matches, summary, players: roster,
    isCurrent: false,
    isComplete: matches.length > 0 && future.length === 0 && matches.every((m) => m.played || (m.date !== null && m.date < today)),
  };
}

export { photoAllowed, rejectedPhotos } from "./assemble";

function parseSquadTab(grid: Grid): Map<string, SquadExtra> {
  const out = new Map<string, SquadExtra>();
  const hdrRow = grid.findIndex((r) => r.some((c) => typeof c === "string" && /^(player|name)$/i.test(c.trim())));
  if (hdrRow < 0) return out;
  const hdr = grid[hdrRow].map((c) => (str(c) ?? "").toLowerCase());
  const col = (re: RegExp) => hdr.findIndex((h) => re.test(h));
  const cName = col(/^(player|name)$/), cNick = col(/nick/), cPos = col(/pos/), cShirt = col(/shirt|number|#/), cPhoto = col(/photo|image|pic/), cBio = col(/bio|about|note/);
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const name = str(grid[r]?.[cName]);
    if (!name) continue;
    const who = canonicalName(name);
    out.set(who, {
      nickname: cNick >= 0 ? str(grid[r][cNick]) ?? undefined : undefined,
      positions: cPos >= 0 ? (str(grid[r][cPos]) ?? "").split(/[\/,\s]+/).filter(Boolean).map((p) => p.toUpperCase()) : undefined,
      shirt: cShirt >= 0 ? num(grid[r][cShirt]) : null,
      photo: cPhoto >= 0 ? safePhoto(who, str(grid[r][cPhoto])) : undefined,
      bio: cBio >= 0 ? str(grid[r][cBio]) ?? undefined : undefined,
    });
  }
  return out;
}

function parseMoney(grid: Grid): { paidBy: Record<string, string>; rows: MoneyRow[] } {
  const paidBy: Record<string, string> = {};
  const hdrRow = findRow(grid, /^player$/i);
  if (hdrRow < 0) return { paidBy, rows: [] };
  const seasonHdr = grid[0] ?? [];
  const pbRow = grid.find((r) => typeof r[0] === "string" && /paid by/i.test(r[0]));
  if (pbRow) seasonHdr.forEach((s, i) => { if (typeof s === "string" && /^S\d+$/.test(s) && str(pbRow[i])) paidBy[s] = canonicalName(str(pbRow[i])!); });
  const hdr = grid[hdrRow].map((c) => str(c) ?? "");
  const chargeCols = hdr.map((h, i) => ({ h, i })).filter(({ h }) => /^S\d+ charges/i.test(h));
  const cTot = hdr.findIndex((h) => /total charged/i.test(h)), cPaid = hdr.findIndex((h) => /^paid$/i.test(h)), cBal = hdr.findIndex((h) => /balance/i.test(h));
  const rows: MoneyRow[] = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const name = str(grid[r]?.[0]);
    if (!name || /^total$/i.test(name)) continue;
    const charges: Record<string, number> = {};
    chargeCols.forEach(({ h, i }) => { charges[h.split(" ")[0]] = num(grid[r][i]) ?? 0; });
    rows.push({ player: canonicalName(name), charges, totalCharged: num(grid[r][cTot]) ?? 0, paid: num(grid[r][cPaid]) ?? 0, balance: num(grid[r][cBal]) ?? 0, pitchCovered: 0 });
  }
  return { paidBy, rows };
}

function parsePayments(grid: Grid): Payment[] {
  const hdrRow = findRow(grid, "Date");
  if (hdrRow < 0) return [];
  const toCol = (grid[hdrRow] ?? []).findIndex((c) => /^(paid )?to$|^recipient$/i.test(str(c) ?? ""));
  const out: Payment[] = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const row = grid[r]; if (!row) continue;
    const player = str(row[1]); const amount = num(row[2]);
    if (!player || amount === null) continue;
    const to = toCol >= 0 ? str(row[toCol]) : null;
    out.push({ date: isoDate(row[0]), player: canonicalName(player), amount, to: to ? canonicalName(to) : null, note: str(row[3]) });
  }
  return out;
}

export function parseWorkbook(buf: ArrayBuffer): ClubData {
  const wb = readWorkbookCached(buf);
  const seasons: Season[] = [];
  let friendlies: Season | null = null;
  let extras = new Map<string, SquadExtra>();
  let money: { paidBy: Record<string, string>; rows: MoneyRow[] } = { paidBy: {}, rows: [] };
  let payments: Payment[] = [];
  // First pass: optional "Aliases" and "Opponents" tabs let the admin fix names without a deploy.
  sheetAliases = {}; sheetOpponents = {}; rejectedPhotos.clear();
  for (const name of wb.SheetNames) {
    if (/^aliases$/i.test(name.trim())) sheetAliases = parseAliasTab(sheetToGrid(wb.Sheets[name]));
    if (/^opponents$/i.test(name.trim())) { const m = parseAliasTab(sheetToGrid(wb.Sheets[name])); for (const [k, v] of Object.entries(m)) sheetOpponents[k.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()] = v; }
  }
  for (const name of wb.SheetNames) {
    const grid = sheetToGrid(wb.Sheets[name]);
    if (/^S\d+$/i.test(name.trim())) { const s = parseSeasonTab(name.trim().toUpperCase(), grid); if (s && s.matches.length) seasons.push(s); }
    else if (/^friendl(y|ies)$/i.test(name.trim())) { const f = parseSeasonTab("FR", grid, { friendlies: true }); if (f && f.matches.length) { f.venue = f.venue || "Various venues"; f.period = f.period || "Whenever we fancy"; friendlies = f; } }
    else if (/^(squad|players|profiles)$/i.test(name.trim())) extras = parseSquadTab(grid);
    else if (/^money$/i.test(name.trim())) money = parseMoney(grid);
    else if (/^payments$/i.test(name.trim())) payments = parsePayments(grid);
  }
  return assembleClubData({ seasons, friendlies, extras: mergeExtras(extras, canonicalName, safePhoto), money, payments, sheetUrl: SHEET_URL });
}

export const REVALIDATE_SECONDS = 60;

/** Live fetch of the whole workbook. Cached by Next's data cache for REVALIDATE_SECONDS. */
/** The single cached download of the workbook (Next data cache, tag "sheet"). */
export async function fetchWorkbook(): Promise<ArrayBuffer> {
  if (process.env.SHEET_FILE) { const { readFile } = await import("node:fs/promises"); const b = await readFile(process.env.SHEET_FILE); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; }
  // During `next build` every prerender worker would download the workbook; use the copy the prebuild step just fetched instead (one request, no 429s).
  if (process.env.NEXT_PHASE === "phase-production-build") { const snap = await snapshotWorkbook(); if (snap) return snap; }
  let lastErr: unknown;
  let rateLimited = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(EXPORT_URL, { next: { revalidate: REVALIDATE_SECONDS, tags: ["sheet"] }, headers: { "user-agent": "thameslinkhajduci.club/1.0" } });
      if (res.status === 429) rateLimited = true;
      if (!res.ok) throw new Error(`Sheet export failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      if (attempt > 0) log("sheet.fetch.recovered", { attempt, ms: Date.now() - t0 });
      return buf;
    } catch (err) {
      lastErr = err;
      log("sheet.fetch.failed", { attempt, ms: Date.now() - t0, error: String(err), rateLimited });
      if (rateLimited) throw err; // Google is asking us to back off; retrying digs the hole deeper. getClubData serves lastGood or the snapshot instead.
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); // Google occasionally hiccups under the build's parallel prerender workers
    }
  }
  throw lastErr;
}

/** Build-time copy of the workbook (scripts/snapshot.mjs), used only when Google is unreachable and nothing better is in memory. */
async function snapshotWorkbook(): Promise<ArrayBuffer | null> {
  try { const { readFile } = await import("node:fs/promises"); const { join } = await import("node:path"); const b = await readFile(join(process.cwd(), ".snapshot", "sheet.xlsx")); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; } catch { return null; }
}

let lastGood: ClubData | null = null;
let parsed: { key: string; data: ClubData } | null = null;
/** Cheap content hash so the same download is parsed once per instance, not once per page render. */
const bufKey = (b: ArrayBuffer) => { const u = new Uint8Array(b); let h = 2166136261; for (let i = 0; i < u.length; i += 97) h = Math.imul(h ^ u[i], 16777619); return `${u.length}:${h >>> 0}`; };
let workbook: { key: string; wb: XLSX.WorkBook } | null = null;
/** XLSX.read is the slow step and every reader of the same bytes (parseWorkbook, the two layouts) wants the same workbook: parse once per instance. */
export function readWorkbookCached(buf: ArrayBuffer): XLSX.WorkBook {
  const key = bufKey(buf);
  if (workbook && workbook.key === key) return workbook.wb;
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  workbook = { key, wb };
  return wb;
}
export function parseWorkbookCached(buf: ArrayBuffer): ClubData {
  const key = bufKey(buf);
  if (parsed && parsed.key === key) return { ...parsed.data, fetchedAt: parsed.data.fetchedAt };
  const t0 = Date.now(); const data = parseWorkbook(buf); log("sheet.parse", { ms: Date.now() - t0, seasons: data.seasons.length, matches: data.matches.length, players: data.players.length });
  parsed = { key, data }; return data;
}
/** Deduped per request with React cache(): layout ticker, generateMetadata and the page share one read. */
export const getClubData = cache(async (): Promise<ClubData> => {
  try {
    const data = parseWorkbookCached(await fetchWorkbook());
    lastGood = data;
    return data;
  } catch (err) {
    if (lastGood) { log("sheet.stale.memory"); return { ...lastGood, stale: true }; }
    const snap = await snapshotWorkbook();
    if (snap) { log("sheet.stale.snapshot"); return { ...parseWorkbookCached(snap), stale: true }; }
    throw err;
  }
});
