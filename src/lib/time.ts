/** Epoch ms for a wall-clock time in Europe/London (fixtures are listed in London time). Plain module so both server and client code can use it. */
export function londonEpoch(date: string, time: string): number {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" }).formatToParts(new Date(guess));
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = tz.match(/GMT([+-]\d+)?/);
  const offsetH = m && m[1] ? parseInt(m[1], 10) : 0;
  return guess - offsetH * 3600_000;
}

/** Today's date (yyyy-mm-dd) in London, where the fixtures live. Vercel runs in UTC, so the plain ISO date lags by an hour in summer. */
/** Hour of the day in London, 0–23. */
export const londonHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(new Date()));
export const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
