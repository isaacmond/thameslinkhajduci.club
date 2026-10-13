/** Instrument Serif for OpenGraph images. Satori cannot use next/font, so fetch the TTF once (Google serves TrueType when no browser UA is sent) and fall back to the default face if offline. */
let cache: ArrayBuffer | null | undefined;
export async function serifFont(): Promise<ArrayBuffer | null> {
  if (cache !== undefined) return cache;
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap", { headers: { "user-agent": "curl/8" }, next: { revalidate: 86400 } })).text();
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/)?.[1] ?? css.match(/url\(([^)]+\.ttf)\)/)?.[1];
    cache = url ? await (await fetch(url, { next: { revalidate: 86400 } })).arrayBuffer() : null;
  } catch { cache = null; }
  return cache;
}
export const ogFonts = (data: ArrayBuffer | null) => (data ? { fonts: [{ name: "Instrument Serif", data, style: "normal" as const, weight: 400 as const }] } : {});
export const display = (data: ArrayBuffer | null) => (data ? '"Instrument Serif", Georgia, serif' : "Georgia, serif");
/** The share-image palette: the site's light theme. */
export const OG = { paper: "#f5f1e8", surface: "#fffcf6", ink: "#17221b", muted: "#5b6861", accent: "#1f5135", gold: "#856109", line: "rgba(23,34,27,0.12)", win: "#1d7244", draw: "#7a5700", loss: "#ad3530" } as const;
