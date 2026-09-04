/** Small, pure helpers shared by the admin actions. Kept apart from submissions.ts so server actions import nothing heavy. */
export const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
export const validEmailAddress = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.trim().length <= 120;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export function rosterName(name: unknown, roster: Iterable<string>): string | null {
  const n = norm(clean(name, 60)); if (!n) return null;
  for (const r of roster) if (norm(r) === n) return r;
  return null;
}
