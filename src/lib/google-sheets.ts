import { createSign } from "node:crypto";
import { canonicalName, SHEET_ID } from "./sheet";
import { a1, quoteTab, toValueRanges, planSquadRow, type CellEdit, type SquadFields } from "./sheet-edits";

/**
 * Write access to the records sheet through a Google service account (GOOGLE_SERVICE_ACCOUNT_JSON holds the key file's JSON;
 * the sheet must be shared with its client_email as an editor). Used when a signed-in member submits something or edits
 * their profile. When the variable is missing, sheetsConfigured() is false and callers fall back to emailing the admin.
 */
type ServiceAccount = { client_email: string; private_key: string };

export function sheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function credentials(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const j = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!j.client_email || !j.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON has no client_email/private_key");
  return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
}

let cachedToken: { token: string; expiresAt: number } | null = null;
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const c = credentials();
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({ iss: c.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(c.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google token endpoint: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cachedToken.token;
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    ...init, cache: "no-store",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Sheets API ${path.split("?")[0]}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** Write cells. Values go in as a person would type them (USER_ENTERED), so "2026-09-04" becomes a date and 'text stays text. */
export async function writeCells(edits: CellEdit[], defaultTab: string | null): Promise<number> {
  if (!edits.length) return 0;
  const j = await api<{ totalUpdatedCells?: number }>("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: toValueRanges(edits, defaultTab) }) });
  return j.totalUpdatedCells ?? edits.length;
}

export async function readRange(range: string): Promise<(string | number | null)[][]> {
  const j = await api<{ values?: (string | number | null)[][] }>(`/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`);
  return j.values ?? [];
}

export async function tabTitles(): Promise<string[]> {
  const j = await api<{ sheets?: { properties: { title: string } }[] }>("?fields=sheets.properties.title");
  return (j.sheets ?? []).map((s) => s.properties.title);
}

/** The Squad tab (created with a header row if the sheet has none). Same name test as the parser. */
export async function ensureSquadTab(): Promise<string> {
  const existing = (await tabTitles()).find((t) => /^(squad|players|profiles)$/i.test(t.trim()));
  if (existing) return existing;
  await api(":batchUpdate", { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: "Squad" } } }] }) });
  return "Squad";
}

/** Put a member's profile fields on their Squad-tab row (created if needed). Returns the tab and 1-based row written. */
export async function upsertSquadRow(player: string, fields: SquadFields, updatedBy: string): Promise<{ tab: string; cells: number }> {
  const tab = await ensureSquadTab();
  const grid = await readRange(`${quoteTab(tab)}!A1:Z500`);
  const stamp = `${new Date().toISOString().slice(0, 16).replace("T", " ")} by ${updatedBy}`;
  const edits = planSquadRow(grid, player, fields, stamp, canonicalName);
  const cells = await writeCells(edits, tab);
  return { tab, cells };
}

export { a1 };
