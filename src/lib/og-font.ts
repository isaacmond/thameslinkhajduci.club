/** Bebas Neue for OpenGraph images. Satori cannot use next/font, so fetch the TTF once (Google serves TrueType when no browser UA is sent) and fall back to the default face if offline. */
let cache: ArrayBuffer | null | undefined;
export async function bebasNeue(): Promise<ArrayBuffer | null> {
  if (cache !== undefined) return cache;
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap", { headers: { "user-agent": "curl/8" }, next: { revalidate: 86400 } })).text();
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/)?.[1] ?? css.match(/url\(([^)]+\.ttf)\)/)?.[1];
    cache = url ? await (await fetch(url, { next: { revalidate: 86400 } })).arrayBuffer() : null;
  } catch { cache = null; }
  return cache;
}
export const ogFonts = (data: ArrayBuffer | null) => (data ? { fonts: [{ name: "Bebas Neue", data, style: "normal" as const, weight: 400 as const }] } : {});
export const display = (data: ArrayBuffer | null) => (data ? '"Bebas Neue", sans-serif' : "sans-serif");
