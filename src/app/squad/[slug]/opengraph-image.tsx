import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { getData } from "@/lib/data";
import { bebasNeue, display, ogFonts } from "@/lib/og-font";

export const alt = "Player card";
export const revalidate = 3600;
export async function generateStaticParams() { const d = await getData(); return d.players.map((p) => ({ slug: p.slug })); }
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const dataUrl = (mime: string, b: Buffer) => `data:${mime};base64,${b.toString("base64")}`;
/** Trust the bytes, not the extension: the sheet picks the path, the file decides the type. */
function imageMime(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}
/** Only files under public/ are embedded; https photos are not fetched on Satori's behalf and fall back to the shirt. Anything odd means no photo, never an error. */
async function localPhoto(photo: string | undefined): Promise<string | null> {
  if (!photo?.startsWith("/")) return null;
  try {
    const abs = resolve(PUBLIC_DIR, "." + photo);
    if (!abs.startsWith(PUBLIC_DIR + sep)) return null;
    const b = await readFile(abs);
    const mime = imageMime(b);
    return mime ? dataUrl(mime, b) : null;
  } catch { return null; }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  const photo = await localPhoto(p?.extra.photo);
  const crest = await readFile(resolve(PUBLIC_DIR, "crest.png")).then((b) => dataUrl("image/png", b)).catch(() => null);
  const font = await bebasNeue();
  const stats: [string, string][] = p ? [["Apps", String(p.apps)], ["Goals", String(p.goals)], ["Assists", String(p.assists)], ["Win %", String(Math.round(p.winRate))]] : [];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #0a1f13 0%, #06140c 100%)", color: "#f6f1e6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 440, height: "100%", background: "#173d25", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {photo ? <img src={photo} alt="" width={440} height={630} style={{ objectFit: "cover", width: 440, height: 630 }} /> : <div style={{ display: "flex", fontSize: 300, color: "rgba(246,241,230,0.85)", fontFamily: display(font) }}>{p?.extra.shirt ?? "?"}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 56, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, letterSpacing: 6, color: "#a7b8ab", textTransform: "uppercase" }}>
            {crest && <img src={crest} alt="" width={56} height={56} />}
            <div>{`Thameslink Hajduci · ${p?.extra.positions?.join(" / ") || "Squad"}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 112, lineHeight: 0.92, fontFamily: display(font) }}>{p?.name ?? "Player"}</div>
            <div style={{ marginTop: 18, fontSize: 28, color: "#7fe0a3" }}>{p?.extra.bio ?? `Debut ${p?.debut ?? "TBC"}${p?.extra.shirt !== null && p?.extra.shirt !== undefined ? ` · No. ${p.extra.shirt}` : ""}`}</div>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {stats.map(([k, v]) => <div key={k} style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 80, lineHeight: 1, fontFamily: display(font) }}>{v}</div><div style={{ fontSize: 18, letterSpacing: 4, color: "#a7b8ab", textTransform: "uppercase", marginTop: 6 }}>{k}</div></div>)}
          </div>
        </div>
      </div>
    ),
    { ...size, ...ogFonts(font) },
  );
}
