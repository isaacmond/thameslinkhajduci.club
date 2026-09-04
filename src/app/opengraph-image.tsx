import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { bebasNeue, display, ogFonts } from "@/lib/og-font";

export const alt = "Thameslink Hajduci";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const crest = await readFile(join(process.cwd(), "public/crest.png"));
  const src = `data:image/png;base64,${crest.toString("base64")}`;
  const font = await bebasNeue();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "linear-gradient(135deg, #0a1f13 0%, #06140c 100%)", color: "#f6f1e6", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 480, height: 480, borderRadius: 999, background: "rgba(50,195,100,0.18)", filter: "blur(40px)" }} />
        <img src={src} width={300} height={300} alt="" style={{ marginRight: 56 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: "#a7b8ab" }}>Est. 2024 · East London</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 148, lineHeight: 0.9, marginTop: 12, fontFamily: display(font), letterSpacing: 1 }}><div>Thameslink</div><div>Hajduci</div></div>
          <div style={{ fontSize: 30, marginTop: 20, color: "#7fe0a3" }}>Forza Hajduci. East London, since 2024.</div>
        </div>
      </div>
    ),
    { ...size, ...ogFonts(font) },
  );
}
