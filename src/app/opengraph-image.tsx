import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { display, OG, ogFonts, serifFont } from "@/lib/og-font";

export const alt = "Thameslink Hajduci";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const crest = await readFile(join(process.cwd(), "public/crest.png"));
  const src = `data:image/png;base64,${crest.toString("base64")}`;
  const font = await serifFont();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: OG.paper, color: OG.ink, padding: 80, fontFamily: "sans-serif" }}>
        <img src={src} width={300} height={300} alt="" style={{ marginRight: 64 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: OG.muted }}>Football club · Est. 2024</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 140, lineHeight: 0.92, marginTop: 16, fontFamily: display(font) }}><div>Thameslink</div><div>Hajduci</div></div>
          <div style={{ fontSize: 30, marginTop: 24, color: OG.accent }}>Six-a-side football in East London</div>
        </div>
      </div>
    ),
    { ...size, ...ogFonts(font) },
  );
}
