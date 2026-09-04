import { describe, expect, it } from "vitest";
import { attendance, currentStreak, form, headToHead, lastResult, leaderboard, playedMatches, preview, recentPlayers, records } from "@/lib/stats";
import { playerInsights } from "@/lib/insights";
import { parseWorkbook } from "@/lib/sheet";
import { club, fixtureWorkbook, line, match, player } from "./helpers";

describe("leaderboard", () => {
  const seb = player({ name: "Seb Burgess", apps: 20, gpgGames: 4, goals: 8, goalsPerGame: 2, apgGames: 4, assists: 2, assistsPerGame: 0.5 });
  const phil = player({ name: "Phil Knott", apps: 5, gpgGames: 5, goals: 5, goalsPerGame: 1, apgGames: 5, assists: 5, assistsPerGame: 1 });
  const ghost = player({ name: "Never Scored", apps: 30, gpgGames: 30, goals: 0 });

  it("per-game thresholds apply to games with scorers logged, not raw apps", () => {
    const rate = leaderboard([seb, phil, ghost], "goalsPerGame", 5);
    expect(rate.map((x) => x.player.name)).toEqual(["Phil Knott"]);
    const loose = leaderboard([seb, phil, ghost], "goalsPerGame", 4);
    expect(loose.map((x) => x.player.name)).toEqual(["Seb Burgess", "Phil Knott"]);
    expect(leaderboard([seb, phil], "assistsPerGame", 5).map((x) => x.player.name)).toEqual(["Phil Knott"]);
  });

  it("raw totals use apps as the threshold and drop zero values", () => {
    expect(leaderboard([seb, phil, ghost], "goals", 5).map((x) => x.player.name)).toEqual(["Seb Burgess", "Phil Knott"]);
    expect(leaderboard([seb, phil, ghost], "goals", 10).map((x) => x.player.name)).toEqual(["Seb Burgess"]);
    expect(leaderboard([seb, phil, ghost], "apps").map((x) => x.player.name)).toEqual(["Never Scored", "Seb Burgess", "Phil Knott"]);
    expect(leaderboard([seb, phil], "ga")[0]).toMatchObject({ value: 10 });
  });
});

describe("lastResult and form", () => {
  const win = match({ date: "2026-05-01", gw: 1, ourGoals: 4, theirGoals: 2, lineup: [line("Seb Burgess", 3), line("Phil Knott", 1)] });
  const forfeit = match({ date: "2026-05-08", gw: 2, ourGoals: 0, theirGoals: 5, type: "Forfeit", opponent: "Ding Cats" });
  const friendly = match({ date: "2026-05-15", gw: 1, seasonId: "FR", ourGoals: 1, theirGoals: 7, opponent: "Dukes Select", lineup: [line("Seb Burgess", 1)] });
  const fixture = match({ date: "2026-05-22", gw: 3, opponent: "Spudos" });
  const data = club([win, forfeit, friendly, fixture]);

  it("ignores forfeits, friendlies and unplayed fixtures", () => {
    expect(lastResult(data)?.id).toBe(win.id);
    expect(form(data.matches).map((m) => m.id)).toEqual([win.id]);
    expect(currentStreak(data.matches)).toEqual({ type: "W", length: 1 });
    expect(playedMatches(data.matches)).toHaveLength(1);
  });

  it("head-to-head skips the games that do not count", () => {
    const h2h = headToHead(data.matches);
    expect(h2h.map((o) => o.opponent)).toEqual(["Old Ivy"]);
    expect(h2h[0]).toMatchObject({ played: 1, won: 1, gf: 4, ga: 2 });
  });
});

describe("records", () => {
  const ms = [
    match({ date: "2026-04-01", gw: 1, ourGoals: 4, theirGoals: 1, lineup: [line("Seb Burgess", 3), line("Phil Knott", 1)] }),
    match({ date: "2026-04-08", gw: 2, ourGoals: 2, theirGoals: 0, lineup: [line("Seb Burgess", 1), line("Phil Knott", 1)] }),
    match({ date: "2026-04-15", gw: 3, ourGoals: 0, theirGoals: 9, type: "Forfeit" }),
    match({ date: "2026-04-22", gw: 4, ourGoals: 6, theirGoals: 5, lineup: [line("Phil Knott", 4), line("Seb Burgess", 2)] }),
    match({ date: "2026-04-29", gw: 5, ourGoals: 1, theirGoals: 8, lineup: [line("Seb Burgess", 1)] }),
    match({ date: "2026-05-06", gw: 6, ourGoals: 2, theirGoals: 2, lineup: [line("Seb Burgess", 2)] }),
    match({ date: "2026-05-13", gw: 7, ourGoals: 0, theirGoals: 3, lineup: [line("Phil Knott")] }),
  ];
  const r = records(club(ms));

  it("finds hat-tricks, biggest first", () => {
    expect(r.hatTricks.map((h) => [h.player, h.goals])).toEqual([["Phil Knott", 4], ["Seb Burgess", 3]]);
    expect(r.hatTricks[1].match.id).toBe("s1-gw1");
  });

  it("streaks skip the forfeit rather than break on it", () => {
    expect(r.longestWin).toMatchObject({ type: "W", length: 3 });
    expect(r.longestWin?.start.id).toBe("s1-gw1");
    expect(r.longestWin?.end.id).toBe("s1-gw4");
    expect(r.longestUnbeaten).toMatchObject({ length: 3 });
    expect(r.longestWinless).toMatchObject({ length: 3 });
    expect(r.longestLosing).toMatchObject({ type: "L", length: 1 });
  });

  it("picks the right games for the extremes", () => {
    expect(r.biggestWin?.id).toBe("s1-gw1");
    expect(r.heaviestDefeat?.id).toBe("s1-gw5");
    expect(r.highestScoring?.id).toBe("s1-gw4");
    expect(r.mostConceded?.id).toBe("s1-gw5");
    expect(r.cleanSheets.map((m) => m.id)).toEqual(["s1-gw2"]);
    expect(r.bestSeason).toBe("S1");
  });

  it("has nothing to say about an empty season", () => {
    const empty = records(club([match({ date: "2026-09-01", gw: 1 })]));
    expect(empty.biggestWin).toBeNull();
    expect(empty.hatTricks).toEqual([]);
    expect(empty.longestWin).toBeNull();
  });
});

describe("preview", () => {
  const history = [3, 1, 4, 2, 0, 5, 2, 1, 3, 6].map((g, i) => match({ date: `2026-03-${String(i + 1).padStart(2, "0")}`, gw: i + 1, ourGoals: g, theirGoals: 2 + (i % 3), opponent: i % 2 ? "Old Ivy" : "Spudos", lineup: [line("Seb Burgess", g)] }));
  const next = match({ date: "2026-06-01", gw: 11, opponent: "Old Ivy" });
  const data = club([...history, next]);

  it("probabilities add up to about 100", () => {
    const p = preview(data, next);
    expect(p.win + p.draw + p.loss).toBeGreaterThanOrEqual(99);
    expect(p.win + p.draw + p.loss).toBeLessThanOrEqual(101);
    expect(p.sample).toBe(10);
    expect(p.h2h?.opponent).toBe("Old Ivy");
    expect(p.expectedFor).toBeGreaterThan(0);
    expect(p.expectedAgainst).toBeGreaterThan(0);
  });

  it("copes with no history at all", () => {
    const p = preview(club([next]), next);
    expect(p.win + p.draw + p.loss).toBeGreaterThanOrEqual(99);
    expect(p.win + p.draw + p.loss).toBeLessThanOrEqual(101);
    expect(p.sample).toBe(0);
    expect(p.h2h).toBeNull();
  });
});

describe("attendance", () => {
  // Every season tab lists the whole squad, so the roster cannot be the denominator: the window between debut and last game is.
  const data = parseWorkbook(fixtureWorkbook());
  const counted = playedMatches(data.matches).length;
  const by = (name: string) => data.players.find((p) => p.name === name)!;

  it("only counts the games between a one-season player's debut and last appearance", () => {
    const ahmed = by("Ahmed");
    expect(ahmed.seasons.filter((s) => s.apps > 0).map((s) => s.seasonId)).toEqual(["S7"]);
    const s7 = data.seasons.find((s) => s.id === "S7")!;
    const span = playedMatches(s7.matches).filter((m) => m.date! >= ahmed.debut! && m.date! <= ahmed.lastPlayed!);
    const a = attendance(data, "Ahmed");
    expect(a).toEqual({ possible: span.length, apps: 3, pct: Math.round((3 / span.length) * 100) });
    expect(a.possible).toBeGreaterThanOrEqual(3);
    expect(a.possible).toBeLessThan(counted);
    expect(attendance(data, "Jake Harrison")).toEqual({ possible: 1, apps: 1, pct: 100 });
  });

  it("runs to date for someone still turning out this season", () => {
    const phil = by("Phil Knott"), cur = data.seasons.find((s) => s.isCurrent)!;
    expect(phil.seasons.some((s) => s.seasonId === cur.id && s.apps > 0)).toBe(true);
    expect(phil.debut).toBe(playedMatches(data.matches).map((m) => m.date).sort()[0]);
    expect(attendance(data, "Phil Knott")).toMatchObject({ possible: counted, apps: phil.apps });
  });

  it("has nothing to say about a name that never played", () => {
    expect(attendance(data, "Nobody")).toEqual({ possible: 0, apps: 0, pct: 0 });
  });
});

describe("recentPlayers", () => {
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
  const here = player({ name: "Here", lastPlayed: iso(10) }), gone = player({ name: "Gone", lastPlayed: iso(400) }), never = player({ name: "Never" });

  it("keeps whoever has played inside the window and drops the departed", () => {
    expect(recentPlayers(club([], [here, gone, never])).map((p) => p.name)).toEqual(["Here"]);
    expect(recentPlayers(club([], [here, gone, never]), 500).map((p) => p.name)).toEqual(["Here", "Gone"]);
  });
});

describe("playerInsights", () => {
  const defeat = (i: number, name: string) => match({ date: `2026-04-${String(i).padStart(2, "0")}`, gw: i, ourGoals: 0, theirGoals: 3, lineup: [line(name)] });

  it("does not claim a last win for someone who has never won", () => {
    const p = player({ name: "Sad Sack", apps: 9, losses: 9, debut: "2026-04-01", lastPlayed: "2026-04-09" });
    const out = playerInsights(club(Array.from({ length: 9 }, (_, i) => defeat(i + 1, p.name)), [p]), p);
    expect(out.join(" ")).not.toContain("last won");
    expect(out).toContain("9 appearances and still waiting for a first win.");
  });

  it("names the last win when there was one", () => {
    const p = player({ name: "Sad Sack", apps: 9, wins: 1, losses: 8, debut: "2026-04-01", lastPlayed: "2026-04-09" });
    const win = match({ date: "2026-04-01", gw: 1, ourGoals: 2, theirGoals: 1, opponent: "Spudos", lineup: [line(p.name, 1)] });
    const out = playerInsights(club([win, ...Array.from({ length: 8 }, (_, i) => defeat(i + 2, p.name))], [p]), p);
    expect(out).toContain("8 appearances since Sad last won (2–1 vs Spudos, Apr 2026).");
  });
});
