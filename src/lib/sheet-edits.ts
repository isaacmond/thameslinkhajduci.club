/**
 * Pure helpers for writing to the records sheet: A1 ranges, column letters and the plan for a Squad-tab row.
 * No I/O here, so it is unit-tested; google-sheets.ts does the talking to Google.
 */
export type CellEdit = { cell: string; value: string | number; what: string };

export const quoteTab = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

/** 0-based column index → letters: 0 → A, 25 → Z, 26 → AA. */
export function colLetter(i: number): string {
  let s = "", n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** "F5" with a default tab → "'S8'!F5"; "Money!A12" or "'All-time'!A9" keeps its own tab. */
export function a1(cell: string, defaultTab: string | null): string {
  const m = cell.trim().match(/^(?:'((?:[^']|'')+)'|([^!']+))!([A-Za-z]{1,3}\d{1,6})$/);
  if (m) return `${quoteTab((m[1] ?? m[2]).replace(/''/g, "'"))}!${m[3].toUpperCase()}`;
  if (!/^[A-Za-z]{1,3}\d{1,6}$/.test(cell.trim())) throw new Error(`Not a cell reference: ${cell}`);
  if (!defaultTab) throw new Error(`No tab for cell ${cell}`);
  return `${quoteTab(defaultTab)}!${cell.trim().toUpperCase()}`;
}

/** The body of a values:batchUpdate call, one range per edited cell. */
export function toValueRanges(edits: CellEdit[], defaultTab: string | null): { range: string; values: (string | number)[][] }[] {
  return edits.map((e) => ({ range: a1(e.cell, defaultTab), values: [[e.value]] }));
}

export const SQUAD_HEADER = ["Player", "Nickname", "Position", "Shirt", "Photo", "Bio", "Updated"] as const;
export type SquadFields = { nickname?: string; positions?: string[]; shirt?: number | null; photo?: string; bio?: string };

/**
 * Given the Squad tab as read from the sheet, work out which cells to write so `player` ends up with `fields`.
 * Finds the header row and columns the same way the parser does, adds any missing columns to the right of the header,
 * reuses the player's row or takes the first free one. Only fields present in `fields` are written ("" clears).
 */
export function planSquadRow(grid: (string | number | null)[][], player: string, fields: SquadFields, stamp: string, canonical: (s: string) => string = (s) => s.trim().toLowerCase()): CellEdit[] {
  const edits: CellEdit[] = [];
  let hdrIdx = grid.findIndex((r) => r.some((c) => typeof c === "string" && /^(player|name)$/i.test(c.trim())));
  let hdr: string[];
  if (hdrIdx < 0) {
    hdrIdx = 0; hdr = SQUAD_HEADER.map((h) => h.toLowerCase());
    SQUAD_HEADER.forEach((h, i) => edits.push({ cell: `${colLetter(i)}1`, value: h, what: "header" }));
  } else hdr = grid[hdrIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const col = (re: RegExp) => hdr.findIndex((h) => h !== "" && re.test(h));
  const cols: Record<string, number> = { name: col(/^(player|name)$/), nick: col(/nick/), pos: col(/pos/), shirt: col(/shirt|number|#/), photo: col(/photo|image|pic/), bio: col(/bio|about|note/), updated: col(/updated/) };
  let width = hdr.length;
  const ensure = (key: string, title: string) => {
    if (cols[key] >= 0) return;
    cols[key] = width++;
    edits.push({ cell: `${colLetter(cols[key])}${hdrIdx + 1}`, value: title, what: "header" });
  };
  ensure("name", "Player");
  if (fields.nickname !== undefined) ensure("nick", "Nickname");
  if (fields.positions !== undefined) ensure("pos", "Position");
  if (fields.shirt !== undefined) ensure("shirt", "Shirt");
  if (fields.photo !== undefined) ensure("photo", "Photo");
  if (fields.bio !== undefined) ensure("bio", "Bio");
  ensure("updated", "Updated");

  const want = canonical(player);
  let rowIdx = grid.findIndex((r, i) => i > hdrIdx && canonical(String(r[cols.name] ?? "")) === want);
  if (rowIdx < 0) {
    rowIdx = grid.findIndex((r, i) => i > hdrIdx && String(r[cols.name] ?? "").trim() === "");
    if (rowIdx < 0) rowIdx = Math.max(grid.length, hdrIdx + 1);
    edits.push({ cell: `${colLetter(cols.name)}${rowIdx + 1}`, value: player, what: "Player" });
  }
  const row = rowIdx + 1;
  const put = (key: string, value: string | number | null | undefined, what: string) => { if (value !== undefined) edits.push({ cell: `${colLetter(cols[key])}${row}`, value: value === null ? "" : value, what }); };
  put("nick", fields.nickname, "Nickname");
  put("pos", fields.positions === undefined ? undefined : fields.positions.join("/"), "Position");
  put("shirt", fields.shirt, "Shirt");
  put("photo", fields.photo, "Photo");
  put("bio", fields.bio, "Bio");
  put("updated", stamp, "Updated");
  return edits;
}
