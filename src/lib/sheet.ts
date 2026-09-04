import * as XLSX from "xlsx";
import { slugify } from "./slug";
import staticExtras from "./squad-extras.json";
import type {
  ClubData, Match, MoneyRow, Payment, Player, PlayerMatchLine, PlayerSeasonStats,
  Result, Season, SeasonSummary, SquadExtra,
} from "./types";

import { SHEET_ID as PUBLIC_SHEET_ID, SHEET_URL } from "./config";
import { londonToday } from "./time";
/** Server-only override wins, then the public id. */
export const SHEET_ID = process.env.SHEET_ID ?? PUBLIC_SHEET_ID;
export { SHEET_URL };
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

/** Names that refer to the same person in the sheet vs the old app. */
const ALIASES: Record<string, string> = {
  "Robin Watson": "Robin",
  Seb: "Seb Burgess",
  "Jake Hamilton": "Jake Ringer",
  "Jacob Hamilton": "Jake Ringer",
};

/** The sheet spells opponents many ways; collapse them so head-to-head records line up. Keys are lower-case, punctuation-free. */
const OPPONENTS: Record<string, string> = {
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
  return OPPONENTS[key] ?? n;
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
export function canonicalName(raw: string) {
  const n = raw.trim().replace(/\s+/g, " ");
  return ALIASES[n] ?? n;
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

function parseSeasonTab(id: string, grid: Grid): Season | null {
  const title = str(grid[0]?.[0]) ?? id;
  const number = Number(id.slice(1));
  const matchRow = findRow(grid, "Match");
  if (matchRow < 0) return null;
  const header = grid[matchRow];
  const gwCols: number[] = [];
  header.forEach((c, i) => { if (typeof c === "string" && /^GW\d+$/i.test(c.trim())) gwCols.push(i); });
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
    const type = str(types[col]);
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
      countsForRecords: !type,
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
      else if (k === "paid by") summary.paidBy = str(v);
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
    out.set(canonicalName(name), {
      nickname: cNick >= 0 ? str(grid[r][cNick]) ?? undefined : undefined,
      positions: cPos >= 0 ? (str(grid[r][cPos]) ?? "").split(/[\/,\s]+/).filter(Boolean).map((p) => p.toUpperCase()) : undefined,
      shirt: cShirt >= 0 ? num(grid[r][cShirt]) : null,
      photo: cPhoto >= 0 ? str(grid[r][cPhoto]) ?? undefined : undefined,
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
    rows.push({ player: canonicalName(name), charges, totalCharged: num(grid[r][cTot]) ?? 0, paid: num(grid[r][cPaid]) ?? 0, balance: num(grid[r][cBal]) ?? 0 });
  }
  return { paidBy, rows };
}

function parsePayments(grid: Grid): Payment[] {
  const hdrRow = findRow(grid, "Date");
  if (hdrRow < 0) return [];
  const out: Payment[] = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const row = grid[r]; if (!row) continue;
    const player = str(row[1]); const amount = num(row[2]);
    if (!player || amount === null) continue;
    out.push({ date: isoDate(row[0]), player: canonicalName(player), amount, note: str(row[3]) });
  }
  return out;
}

function buildPlayers(seasons: Season[], extras: Map<string, SquadExtra>): Player[] {
  const map = new Map<string, Player>();
  const get = (name: string) => {
    let p = map.get(name);
    if (!p) {
      p = { name, slug: slugify(name), apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0, goalsPerGame: 0, assistsPerGame: 0, gpgGames: 0, apgGames: 0, winRate: 0, debut: null, lastPlayed: null, seasons: [], extra: extras.get(name) ?? {} };
      map.set(name, p);
    }
    return p;
  };
  for (const s of seasons) {
    const perSeason = new Map<string, PlayerSeasonStats>();
    const ps = (name: string) => {
      let x = perSeason.get(name);
      if (!x) { x = { seasonId: s.id, apps: 0, gpgGames: 0, apgGames: 0, goals: 0, assists: 0, motm: 0, cost: 0 }; perSeason.set(name, x); }
      return x;
    };
    const roster = new Set(s.players);
    for (const name of s.players) { get(name); }
    for (const m of s.matches) {
      for (const l of m.lineup) {
        const p = get(l.player); const x = ps(l.player);
        x.cost += l.cost;
        if (!m.countsForRecords) continue;
        if (l.played) {
          x.apps++; p.apps++;
          if (m.played && m.scorersRecorded) { x.gpgGames++; p.gpgGames++; }
          if (m.played && m.assistsRecorded) { x.apgGames++; p.apgGames++; }
          if (m.played) { if (m.result === "W") p.wins++; else if (m.result === "D") p.draws++; else if (m.result === "L") p.losses++; }
          if (m.date) { if (!p.debut || m.date < p.debut) p.debut = m.date; if (!p.lastPlayed || m.date > p.lastPlayed) p.lastPlayed = m.date; }
        }
        x.goals += l.goals; p.goals += l.goals; x.assists += l.assists; p.assists += l.assists;
      }
      // Awards only count for people on the season's roster; a typo or a guest in the MOTM cell must not mint a new squad member.
      if (m.countsForRecords && m.motm && roster.has(m.motm)) { const p = get(m.motm); p.motm++; ps(m.motm).motm++; }
    }
    for (const [name, x] of perSeason) { if (x.apps || x.goals || x.assists || x.motm) get(name).seasons.push(x); }
  }
  for (const p of map.values()) {
    p.goalsPerGame = p.gpgGames ? +(p.goals / p.gpgGames).toFixed(2) : 0;
    p.assistsPerGame = p.apgGames ? +(p.assists / p.apgGames).toFixed(2) : 0;
    const decided = p.wins + p.draws + p.losses;
    p.winRate = decided ? +((p.wins / decided) * 100).toFixed(1) : 0;
  }
  return [...map.values()].filter((p) => p.apps > 0 || p.goals > 0 || p.assists > 0 || p.motm > 0).sort((a, b) => b.apps - a.apps || b.goals - a.goals || a.name.localeCompare(b.name));
}

const STATIC_EXTRAS: Record<string, { shirt: number | null; positions: string[]; photo: string | null }> = staticExtras;

/** Bundled profile extras (from the old team app) as a baseline; a "Squad" tab in the sheet overrides field by field. */
function mergeExtras(fromSheet: Map<string, SquadExtra>): Map<string, SquadExtra> {
  const merged = new Map<string, SquadExtra>();
  for (const [name, e] of Object.entries(STATIC_EXTRAS)) merged.set(canonicalName(name), { shirt: e.shirt, positions: e.positions, photo: e.photo ?? undefined });
  for (const [name, e] of fromSheet) {
    const base = merged.get(name) ?? {};
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)));
    merged.set(name, { ...base, ...clean });
  }
  return merged;
}

export function parseWorkbook(buf: ArrayBuffer): ClubData {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const seasons: Season[] = [];
  let extras = new Map<string, SquadExtra>();
  let money: { paidBy: Record<string, string>; rows: MoneyRow[] } = { paidBy: {}, rows: [] };
  let payments: Payment[] = [];
  for (const name of wb.SheetNames) {
    const grid = sheetToGrid(wb.Sheets[name]);
    if (/^S\d+$/i.test(name.trim())) { const s = parseSeasonTab(name.trim().toUpperCase(), grid); if (s && s.matches.length) seasons.push(s); }
    else if (/^(squad|players|profiles)$/i.test(name.trim())) extras = parseSquadTab(grid);
    else if (/^money$/i.test(name.trim())) money = parseMoney(grid);
    else if (/^payments$/i.test(name.trim())) payments = parsePayments(grid);
  }
  seasons.sort((a, b) => a.number - b.number);
  // current season = latest season that isn't complete, else the latest season
  const current = [...seasons].reverse().find((s) => !s.isComplete) ?? seasons[seasons.length - 1];
  if (current) current.isCurrent = true;
  const matches = seasons.flatMap((s) => s.matches).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.seasonNumber - b.seasonNumber || a.gw - b.gw);
  const players = buildPlayers(seasons, mergeExtras(extras));
  const allTime: SeasonSummary = seasons.reduce((acc, s) => ({
    ...acc, played: acc.played + s.summary.played, won: acc.won + s.summary.won, drawn: acc.drawn + s.summary.drawn, lost: acc.lost + s.summary.lost,
    goalsFor: acc.goalsFor + s.summary.goalsFor, goalsAgainst: acc.goalsAgainst + s.summary.goalsAgainst, seasonCost: acc.seasonCost + s.summary.seasonCost,
  }), { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, topScorer: null, mostApps: null, seasonCost: 0, paidBy: null } as SeasonSummary);
  allTime.topScorer = players.length ? `${[...players].sort((a, b) => b.goals - a.goals)[0].name}` : null;
  allTime.mostApps = players.length ? players[0].name : null;
  return { fetchedAt: new Date().toISOString(), sheetUrl: SHEET_URL, seasons, matches, players, money: { ...money, payments }, allTime };
}

export const REVALIDATE_SECONDS = 60;

/** Live fetch of the whole workbook. Cached by Next's data cache for REVALIDATE_SECONDS. */
let lastGood: ClubData | null = null;
export async function getClubData(): Promise<ClubData> {
  try {
    const res = await fetch(EXPORT_URL, { next: { revalidate: REVALIDATE_SECONDS, tags: ["sheet"] }, headers: { "user-agent": "thameslinkhajduci.club/1.0" } });
    if (!res.ok) throw new Error(`Sheet export failed: ${res.status}`);
    const data = parseWorkbook(await res.arrayBuffer());
    lastGood = data;
    return data;
  } catch (err) {
    if (lastGood) return { ...lastGood, stale: true };
    throw err;
  }
}
