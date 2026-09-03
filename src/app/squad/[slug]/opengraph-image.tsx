import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getData } from "@/lib/data";
import { playerCaption } from "@/lib/captions";

export const alt = "Player card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const p = data.players.find((x) => x.slug === slug);
  let photo: string | null = null;
  if (p?.extra.photo?.startsWith("/")) {
    try { photo = `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "public", p.extra.photo))).toString("base64")}`; } catch { photo = null; }
  } else if (p?.extra.photo) photo = p.extra.photo;
  const crest = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/crest.png"))).toString("base64")}`;
  const stats: [string, string][] = p ? [["Apps", String(p.apps)], ["Goals", String(p.goals)], ["Assists", String(p.assists)], ["Win %", String(Math.round(p.winRate))]] : [];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #0a1f13 0%, #06140c 100%)", color: "#f6f1e6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 440, height: "100%", background: "#173d25", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {photo ? <img src={photo} alt="" width={440} height={630} style={{ objectFit: "cover", width: 440, height: 630 }} /> : <div style={{ display: "flex", fontSize: 240, fontWeight: 800, color: "rgba(246,241,230,0.85)" }}>{p?.extra.shirt ?? "?"}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 56, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, letterSpacing: 6, color: "#a7b8ab", textTransform: "uppercase" }}>
            <img src={crest} alt="" width={56} height={56} />
            <div>{`Thameslink Hajduci · ${p?.extra.positions?.join(" / ") || "Squad"}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 0.95 }}>{p?.name ?? "Player"}</div>
            <div style={{ marginTop: 18, fontSize: 28, color: "#7fe0a3", fontStyle: "italic" }}>{p ? playerCaption({ ...p, positions: p.extra.positions }) : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {stats.map(([k, v]) => <div key={k} style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{v}</div><div style={{ fontSize: 18, letterSpacing: 4, color: "#a7b8ab", textTransform: "uppercase", marginTop: 6 }}>{k}</div></div>)}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
