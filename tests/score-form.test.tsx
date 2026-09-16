import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreForm, type SubmitFixture } from "@/components/score-form";

const fixture = (over: Partial<SubmitFixture>): SubmitFixture => ({ id: "s8-gw3", label: "Tue 15 Sept · GW3 vs TMHLR F.C.", seasonId: "S8", gw: 3, opponent: "TMHLR F.C.", date: "2026-09-15", played: false, ourGoals: null, theirGoals: null, lineup: [], expected: [], scorers: {}, assists: {}, motm: null, type: null, matchCost: 79.95, ...over });
const roster = ["Ben Merrett", "Finn Cawley", "Isaac Mond", "Phil Knott"];
const pressed = (html: string) => [...html.matchAll(/aria-pressed="true"[^>]*>.*?<span class="truncate">([^<]+)</g)].map((m) => m[1]);

describe("ScoreForm and the team sheet", () => {
  it("ticks the expected squad when the fixture has no recorded line-up", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ expected: ["Ben Merrett", "Phil Knott"] })]} roster={roster} webhook={false} />);
    expect(pressed(html)).toEqual(["Ben Merrett", "Phil Knott"]);
    expect(html).toContain("Ticked from the team sheet");
    expect(html).toContain("2 expected");
  });
  it("prefers the recorded line-up over the team sheet for a played game", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ played: true, ourGoals: 2, theirGoals: 5, lineup: ["Finn Cawley"], expected: ["Ben Merrett", "Phil Knott"] })]} roster={roster} webhook={false} />);
    expect(pressed(html)).toEqual(["Finn Cawley"]);
    expect(html).not.toContain("team sheet");
  });
  it("starts empty with no team sheet and no line-up", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({})]} roster={roster} webhook={false} />);
    expect(pressed(html)).toEqual([]);
    expect(html).not.toContain("team sheet");
  });
  it("a fixture typed Forfeit opens on the bill: who pays, not who played, and the team sheet is not pre-ticked", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ type: "Forfeit", expected: ["Ben Merrett", "Phil Knott"] })]} roster={roster} webhook={false} />);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("paying for it");
    expect(pressed(html)).toEqual([]);
    expect(html).toContain("Nobody ticked");
    expect(html).toContain("Tick the whole team sheet");
    expect(html).not.toContain("Man of the match");
    expect(html).toContain("Prepare the forfeit");
  });
  it("a recorded forfeit keeps its payers and shows each one's share", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ type: "Forfeit", played: true, ourGoals: 0, theirGoals: 8, lineup: ["Isaac Mond", "Phil Knott", "Finn Cawley"] })]} roster={roster} webhook={false} />);
    expect(pressed(html)).toEqual(["Finn Cawley", "Isaac Mond", "Phil Knott"]);
    expect(html).toContain("3 on the hook");
    expect(html).toContain("£26.65 each");
    expect(html).toContain("a forfeit recorded");
  });
});
