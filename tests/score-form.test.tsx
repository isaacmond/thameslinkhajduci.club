import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreForm, type SubmitFixture } from "@/components/score-form";

const fixture = (over: Partial<SubmitFixture>): SubmitFixture => ({ id: "s8-gw3", label: "Tue 15 Sept · GW3 vs TMHLR F.C.", seasonId: "S8", gw: 3, opponent: "TMHLR F.C.", date: "2026-09-15", played: false, ourGoals: null, theirGoals: null, lineup: [], expected: [], scorers: {}, assists: {}, motm: null, type: null, matchCost: 79.95, kickOff: "18:15", ringers: [], priorApps: {}, counted: true, ...over });
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
  it("a recorded ringer is listed with the levy on the regulars, worked out from the window plus the night's ticks", () => {
    const priorApps = { "Ben Merrett": 4, "Finn Cawley": 3, "Isaac Mond": 3, "Phil Knott": 1 };
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ played: true, ourGoals: 11, theirGoals: 5, lineup: ["Ben Merrett", "Phil Knott", "Isaac Mond"], ringers: ["Alex"], priorApps })]} roster={roster} webhook={false} />);
    expect(html).toContain("Ringer</span><span class=\"truncate\">Alex</span>");
    // 4 on the pitch at £19.99 a head; Ben, Phil and Isaac played so pay nothing extra; Finn (3) is the one absent regular and gets the whole £19.99
    expect(html).toContain("4 on the pitch, £19.99 a head");
    expect(html).toContain("split between the 1 regular who did not play");
    expect(html).toContain("£19.99 each");
    expect(html).toContain(": Finn Cawley.");
    expect(html).toContain("Add ringer");
  });
  it("a recorded forfeit keeps its payers and shows each one's share", () => {
    const html = renderToStaticMarkup(<ScoreForm fixtures={[fixture({ type: "Forfeit", played: true, ourGoals: 0, theirGoals: 8, lineup: ["Isaac Mond", "Phil Knott", "Finn Cawley"] })]} roster={roster} webhook={false} />);
    expect(pressed(html)).toEqual(["Finn Cawley", "Isaac Mond", "Phil Knott"]);
    expect(html).toContain("3 on the hook");
    expect(html).toContain("£26.65 each");
    expect(html).toContain("a forfeit recorded");
  });
});
