import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getData } from "@/lib/data";
import { fmtDate, gwLabel } from "@/lib/stats";
import { resultWord } from "@/lib/captions";
import { display, OG, ogFonts, serifFont } from "@/lib/og-font";

export const alt = "Match report";
export const revalidate = 3600;
export async function generateStaticParams() { const d = await getData(); return d.matches.map((m) => ({ id: m.id })); }
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
const tone = { W: OG.win, D: OG.draw, L: OG.loss } as const;

/** A match card for link previews: the score, the date, the scorers. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const m = data.matches.find((x) => x.id === id);
  const season = m ? data.seasons.find((s) => s.id === m.seasonId) : undefined;
  const scorers = m ? m.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals).map((l) => `${l.player}${l.goals > 1 ? ` (${l.goals})` : ""}`).join(", ") : "";
  const opponent = m ? (/^forfeit$/i.test(m.opponent) ? "Nobody (forfeit)" : m.opponent) : "Unknown";
  const crest = await readFile(join(process.cwd(), "public/crest.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`).catch(() => null);
  const font = await serifFont();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.paper, color: OG.ink, padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, letterSpacing: 4, color: OG.muted, textTransform: "uppercase" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>{crest && <img src={crest} alt="" width={48} height={48} />}Thameslink Hajduci</div>
          <div>{m ? (m.seasonId === "FR" ? "Friendly" : `Season ${m.seasonNumber} · ${gwLabel(m)}`) : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 64 }}>
          <div style={{ display: "flex", flex: 1, fontSize: 64, lineHeight: 1, textAlign: "right", justifyContent: "flex-end", fontFamily: display(font) }}>Thameslink Hajduci</div>
          <div style={{ display: "flex", fontSize: 180, lineHeight: 0.9, fontFamily: display(font) }}>{m?.played ? `${m.ourGoals}–${m.theirGoals}` : "v"}</div>
          <div style={{ display: "flex", flex: 1, fontSize: 64, lineHeight: 1, fontFamily: display(font) }}>{opponent}</div>
        </div>
        {m?.played && m.result && <div style={{ display: "flex", justifyContent: "center", marginTop: 20, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: tone[m.result] }}>{resultWord(m.result)}</div>}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", borderTop: `1px solid ${OG.line}`, paddingTop: 24, fontSize: 24, color: OG.muted, lineHeight: 1.45 }}>
          <div>{`${fmtDate(m?.date ?? null, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${m?.kickOff ? ` · ${m.kickOff}` : ""}${season ? ` · ${season.venue.split(/[—(]/)[0].trim()}` : ""}`}</div>
          <div style={{ color: OG.ink }}>{`${scorers ? `Goals: ${scorers}` : ""}${m?.motm ? `${scorers ? " · " : ""}Man of the match: ${m.motm}` : ""}`}</div>
        </div>
      </div>
    ),
    { ...size, ...ogFonts(font) },
  );
}
