import { ImageResponse } from "next/og";
import { getData } from "@/lib/data";
import { fmtDate } from "@/lib/stats";
import { serviceStatus } from "@/lib/captions";

export const alt = "Match report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
const tone = { ok: "#7fe0a3", late: "#f4c81b", bad: "#ff9a9d", muted: "#a7b8ab" } as const;

/** A departure-board style card so a match link in the group chat looks like a service announcement. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const m = data.matches.find((x) => x.id === id);
  const season = m ? data.seasons.find((s) => s.id === m.seasonId) : undefined;
  const status = serviceStatus(m?.played ? m.result : null);
  const scorers = m ? m.lineup.filter((l) => l.goals > 0).sort((a, b) => b.goals - a.goals).map((l) => `${l.player}${l.goals > 1 ? ` x${l.goals}` : ""}`).join(", ") : "";
  const opponent = m ? (/^forfeit$/i.test(m.opponent) ? "Nobody (forfeit)" : m.opponent) : "Unknown";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#07130b", color: "#f6f1e6", padding: 56, fontFamily: "sans-serif", backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 2px, transparent 2px 6px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 6, color: "#a7b8ab", textTransform: "uppercase" }}>
          <div>Departures · Thameslink Hajduci</div>
          <div>{m ? `${m.seasonId} · GW${m.gw}` : ""}</div>
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: "#f4c81b", letterSpacing: 2 }}>{m?.kickOff ? `${m.kickOff} · ` : ""}{fmtDate(m?.date ?? null, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{season ? ` · ${season.venue.split(/[—(]/)[0].trim()}` : ""}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 40 }}>
          <div style={{ display: "flex", flex: 1, fontSize: 46, fontWeight: 800, lineHeight: 1.05, textAlign: "right", justifyContent: "flex-end" }}>Thameslink Hajduci</div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{m?.played ? `${m.ourGoals}–${m.theirGoals}` : "v"}</div>
          <div style={{ display: "flex", flex: 1, fontSize: 46, fontWeight: 800, lineHeight: 1.05 }}>{opponent}</div>
        </div>
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 24, color: "#a7b8ab", maxWidth: 760, lineHeight: 1.4 }}>
            <div>{scorers ? `Scorers: ${scorers}` : m?.played ? "No Hajduci goals recorded" : "Fixture"}</div>
            <div>{m?.motm ? `MOTM: ${m.motm}` : m?.comment ? `"${m.comment}"` : ""}</div>
          </div>
          <div style={{ display: "flex", fontSize: 44, letterSpacing: 8, textTransform: "uppercase", color: tone[status.tone] }}>{status.word}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
