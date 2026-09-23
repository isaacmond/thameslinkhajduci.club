import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// The ballot component refreshes the page through the app router once the last vote closes the poll; there is no router in a test.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
import { parseWorkbook, lastParsedAliases, ALIASES, OPPONENTS } from "@/lib/sheet";
import { importClubData } from "@/lib/db-import";
import { loadClubData } from "@/lib/db-data";
import { addMember, recordScore } from "@/lib/writes";
import { decide, pollEligible, renderBallot, renderResult, tally } from "@/lib/motm";
import { ballotView, castVote, closeDuePolls, closeMotmPoll, listMotmPolls, openMotmPoll, pollSummary, sendBallots } from "@/lib/motm-polls";
import type { Db } from "@/lib/db";
import { testDb } from "./db";

const at = (iso: string) => new Date(iso);
const m = { id: "s8-gw9", seasonId: "S8", gw: 9, opponent: "Old Ivy", date: "2026-09-21", ourGoals: 3, theirGoals: 1 };
const cands = [{ player: "Phil Knott", goals: 2, assists: 0 }, { player: "Seb Burgess", goals: 1, assists: 1 }, { player: "Isaac Mond", goals: 0, assists: 2 }, { player: "Max Cobain", goals: 0, assists: 0 }];
const b = (player: string, vote: string | null, t = "2026-09-21T21:00:00Z") => ({ player, vote, votedAt: vote ? at(t) : null });

describe("deciding the man of the match", () => {
  it("most votes wins, and the tally is ordered the same way", () => {
    const d = decide([b("Phil Knott", "Seb Burgess"), b("Seb Burgess", "Isaac Mond"), b("Isaac Mond", "Seb Burgess"), b("Max Cobain", null)], cands);
    expect(d.winner).toBe("Seb Burgess"); expect(d.voted).toBe(3); expect(d.tieBreak).toBeNull();
    expect(tally([b("Phil Knott", "Seb Burgess"), b("Seb Burgess", "Isaac Mond"), b("Isaac Mond", "Seb Burgess")], cands).map((c) => `${c.player}:${c.votes}`)).toEqual(["Seb Burgess:2", "Isaac Mond:1", "Phil Knott:0", "Max Cobain:0"]);
  });
  it("level on votes: goals, then assists, then who got there first", () => {
    expect(decide([b("Isaac Mond", "Phil Knott"), b("Max Cobain", "Seb Burgess")], cands)).toMatchObject({ winner: "Phil Knott", tieBreak: "goals" });
    const noGoals = cands.map((c) => ({ ...c, goals: 0 }));
    expect(decide([b("Phil Knott", "Isaac Mond"), b("Max Cobain", "Seb Burgess")], noGoals)).toMatchObject({ winner: "Isaac Mond", tieBreak: "assists" });
    const flat = cands.map((c) => ({ ...c, goals: 0, assists: 0 }));
    expect(decide([b("Phil Knott", "Isaac Mond", "2026-09-21T21:05:00Z"), b("Max Cobain", "Seb Burgess", "2026-09-21T21:01:00Z")], flat)).toMatchObject({ winner: "Seb Burgess", tieBreak: "first" });
  });
  it("nobody voted, nobody wins", () => {
    expect(decide([b("Phil Knott", null)], cands).winner).toBeNull();
  });
  it("only league games with at least two players get a vote", () => {
    expect(pollEligible({ seasonId: "S8", type: null, ourGoals: 1, theirGoals: 0 }, ["A", "B"]).ok).toBe(true);
    expect(pollEligible({ seasonId: "S8", type: "Forfeit", ourGoals: 0, theirGoals: 8 }, ["A", "B"])).toMatchObject({ ok: false, reason: expect.stringContaining("orfeit") });
    expect(pollEligible({ seasonId: "S8", type: "Friendly", ourGoals: 1, theirGoals: 0 }, ["A", "B"]).ok).toBe(false);
    expect(pollEligible({ seasonId: "FR", type: null, ourGoals: 1, theirGoals: 0 }, ["A", "B"]).ok).toBe(false);
    expect(pollEligible({ seasonId: "S8", type: null, ourGoals: null, theirGoals: null }, ["A", "B"]).ok).toBe(false);
    expect(pollEligible({ seasonId: "S8", type: null, ourGoals: 1, theirGoals: 0 }, ["A"]).ok).toBe(false);
  });
});

describe("the emails", () => {
  it("the ballot lists everyone but the voter, each name a link that pre-picks them", () => {
    const mail = renderBallot({ match: m, voter: "Isaac Mond", candidates: cands, token: "tok123", closesAt: at("2026-09-23T19:30:00Z") });
    expect(mail.subject).toBe("Man of the match vote: Hajduci 3–1 Old Ivy");
    expect(mail.text).toContain("Who was the man of the match, Isaac?");
    expect(mail.text).toContain("/motm/tok123?pick=Phil%20Knott");
    expect(mail.text).not.toContain("Isaac Mond:");
    expect(mail.html).toContain("2 goals");
    expect(mail.text).toContain("Voting closes Wednesday 20:30");
  });
  it("the result names the winner and shows the count", () => {
    const mail = renderResult({ match: m, winner: "Seb Burgess", counts: [{ player: "Seb Burgess", votes: 2 }, { player: "Isaac Mond", votes: 1 }, { player: "Phil Knott", votes: 0 }], ballots: 4, reason: "everyone voted" });
    expect(mail.subject).toBe("Man of the match: Seb Burgess · Hajduci 3–1 Old Ivy");
    expect(mail.text).toContain("2 of 3 votes");
    expect(mail.text).toContain("Everyone voted");
    expect(mail.text).not.toContain("Phil Knott: 0");
  });
});

describe("the vote against the records", () => {
  let db: Db;
  let close: () => Promise<void>;
  const squad = ["Phil Knott", "Seb Burgess", "Isaac Mond", "Max Cobain", "Ben Merrett"];
  let fixtures: string[];
  beforeAll(async () => {
    ({ db, close } = await testDb());
    const buf = readFileSync("sheet-fixes/thameslink-hajduci-corrected.xlsx");
    const parsed = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const a = lastParsedAliases();
    await importClubData(db, parsed, { aliases: { ...ALIASES, ...a.players }, opponents: { ...OPPONENTS, ...a.opponents } });
    // four of the five have an address; Ben does not, so he can be picked but cannot vote
    for (const p of squad.slice(0, 4)) await addMember(`${p.split(" ")[0].toLowerCase()}@example.com`, p, false, "test", db);
    await addMember("phil.other@example.com", "Phil Knott", false, "test", db);
    const data = await loadClubData(db);
    fixtures = data.seasons.find((s) => s.id === "S8")!.matches.filter((x) => !x.played).map((x) => x.id);
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });
  afterAll(async () => { await close(); });

  it("opens with one ballot per player who has an email, and closes itself when the last one votes", async () => {
    const id = fixtures[0];
    const t0 = at("2026-09-21T20:00:00Z");
    await recordScore({ matchId: id, ours: 3, theirs: 1, scorers: { "Phil Knott": 2, "Seb Burgess": 1 }, assists: { "Isaac Mond": 2, "Seb Burgess": 1 }, played: squad, motm: "Ben Merrett", comment: null }, "test", db);
    const r = await openMotmPoll(id, "test", db, t0);
    expect(r.outcome).toBe("opened");
    expect(r.toSend.map((t) => t.ballot.player).sort()).toEqual(["Isaac Mond", "Max Cobain", "Phil Knott", "Seb Burgess"]);
    expect(r.toSend.find((t) => t.ballot.player === "Phil Knott")!.emails.sort()).toEqual(["phil.other@example.com", "phil@example.com"]);
    expect(r.noEmail).toEqual(["Ben Merrett"]);
    expect(r.closesAt!.toISOString()).toBe("2026-09-23T20:00:00.000Z");
    expect(r.fixture!.candidates.map((c) => c.player)).toContain("Ben Merrett");
    // no Resend key in tests: nothing goes out, and that is reported rather than thrown
    expect((await sendBallots(r, db)).skipped).toMatch(/RESEND_API_KEY/);
    // opening again changes nothing
    expect((await openMotmPoll(id, "test", db, t0)).outcome).toBe("unchanged");

    const tok = (p: string) => r.toSend.find((t) => t.ballot.player === p)!.ballot.token;
    expect(await castVote("nonsense", "Phil Knott", db, t0)).toMatchObject({ ok: false });
    expect(await castVote(tok("Phil Knott"), "Phil Knott", db, t0)).toMatchObject({ ok: false, error: expect.stringContaining("yourself") });
    expect(await castVote(tok("Phil Knott"), "Robin Watson", db, t0)).toMatchObject({ ok: false, error: expect.stringContaining("not on the pitch") });
    expect(await castVote(tok("Phil Knott"), "Seb Burgess", db, at("2026-09-21T20:10:00Z"))).toMatchObject({ ok: true, closed: null });
    // a change of mind
    expect(await castVote(tok("Phil Knott"), "Ben Merrett", db, at("2026-09-21T20:11:00Z"))).toMatchObject({ ok: true });
    expect(await castVote(tok("Seb Burgess"), "Phil Knott", db, at("2026-09-21T20:12:00Z"))).toMatchObject({ ok: true });
    expect(await castVote(tok("Isaac Mond"), "Phil Knott", db, at("2026-09-21T20:13:00Z"))).toMatchObject({ ok: true });
    const view = await ballotView(tok("Max Cobain"), db, at("2026-09-21T20:14:00Z"));
    expect(view!.ballots.filter((x) => x.voted).length).toBe(3); expect(view!.counts).toBeNull(); expect(view!.candidates.length).toBe(5);
    const last = await castVote(tok("Max Cobain"), "Phil Knott", db, at("2026-09-21T20:15:00Z"));
    expect(last.ok && last.closed).toMatchObject({ winner: "Phil Knott", voted: 4, ballots: 4, reason: "everyone voted" });
    // the winner is in the records, over the name the score form offered
    const data = await loadClubData(db);
    expect(data.matches.find((x) => x.id === id)!.motm).toBe("Phil Knott");
    const s = await pollSummary(id, db);
    expect(s).toMatchObject({ status: "closed", winner: "Phil Knott", voted: 4, ballots: 4, closedBy: "everyone voted", noVote: ["Ben Merrett"] });
    expect(s!.counts![0]).toEqual({ player: "Phil Knott", votes: 3 });
    // voting is over
    expect(await castVote(tok("Phil Knott"), "Seb Burgess", db, at("2026-09-21T20:16:00Z"))).toMatchObject({ ok: false, closed: true });
    expect((await openMotmPoll(id, "test", db)).outcome).toBe("unchanged");
    expect(await closeMotmPoll(id, "test", db)).toBeNull();
  });

  it("closes at the deadline with whatever came in, and a late ballot is refused", async () => {
    const id = fixtures[1];
    const t0 = at("2026-09-22T20:00:00Z");
    await recordScore({ matchId: id, ours: 1, theirs: 1, scorers: { "Seb Burgess": 1 }, assists: {}, played: squad.slice(0, 4), motm: null, comment: null }, "test", db);
    const r = await openMotmPoll(id, "test", db, t0);
    expect(r.outcome).toBe("opened"); expect(r.noEmail).toEqual([]);
    const tok = (p: string) => r.toSend.find((t) => t.ballot.player === p)!.ballot.token;
    expect(await castVote(tok("Phil Knott"), "Seb Burgess", db, at("2026-09-22T21:00:00Z"))).toMatchObject({ ok: true });
    // not due yet
    expect(await closeDuePolls(db, at("2026-09-24T19:59:00Z"))).toEqual([]);
    const closed = await closeDuePolls(db, at("2026-09-24T20:00:00Z"));
    expect(closed).toHaveLength(1); expect(closed[0]).toMatchObject({ matchId: id, winner: "Seb Burgess", voted: 1, ballots: 4, reason: "deadline" });
    expect((await loadClubData(db)).matches.find((x) => x.id === id)!.motm).toBe("Seb Burgess");
    expect(await castVote(tok("Isaac Mond"), "Seb Burgess", db, at("2026-09-24T20:01:00Z"))).toMatchObject({ ok: false, closed: true });
  });

  it("a late vote on a still-open poll closes it on the way in; no votes means no winner and the recorded MOTM stands", async () => {
    const id = fixtures[2];
    const t0 = at("2026-09-23T20:00:00Z");
    await recordScore({ matchId: id, ours: 0, theirs: 2, scorers: {}, assists: {}, played: squad.slice(0, 4), motm: "Max Cobain", comment: null }, "test", db);
    const r = await openMotmPoll(id, "test", db, t0);
    const tok = r.toSend[0].ballot.token;
    expect(await castVote(tok, "Seb Burgess", db, at("2026-09-25T20:00:00Z"))).toMatchObject({ ok: false, closed: true, error: expect.stringContaining("closed") });
    const s = await pollSummary(id, db);
    expect(s).toMatchObject({ status: "closed", winner: null, voted: 0, closedBy: "deadline" });
    expect((await loadClubData(db)).matches.find((x) => x.id === id)!.motm).toBe("Max Cobain");
    // opening a ballot page after the deadline does the same
    const view = await ballotView(tok, db, at("2026-09-26T20:00:00Z"));
    expect(view!.poll.status).toBe("closed"); expect(view!.counts).not.toBeNull();
  });

  it("a corrected line-up moves the ballots with it, and a forfeit cancels the vote", async () => {
    const data = await loadClubData(db);
    const id = data.seasons.find((s) => s.id === "S8")!.matches.find((x) => !x.played)!.id;
    const t0 = at("2026-09-24T20:00:00Z");
    await recordScore({ matchId: id, ours: 2, theirs: 0, scorers: {}, assists: {}, played: ["Phil Knott", "Seb Burgess", "Isaac Mond"], motm: null, comment: null }, "test", db);
    const r = await openMotmPoll(id, "test", db, t0);
    const tok = (p: string) => r.toSend.find((t) => t.ballot.player === p)!.ballot.token;
    expect(await castVote(tok("Phil Knott"), "Isaac Mond", db, at("2026-09-24T20:05:00Z"))).toMatchObject({ ok: true });
    expect(await castVote(tok("Seb Burgess"), "Phil Knott", db, at("2026-09-24T20:06:00Z"))).toMatchObject({ ok: true });
    // Isaac was not there after all; Max was
    await recordScore({ matchId: id, ours: 2, theirs: 0, scorers: {}, assists: {}, played: ["Phil Knott", "Seb Burgess", "Max Cobain"], motm: null, comment: null }, "test", db);
    const r2 = await openMotmPoll(id, "test", db, at("2026-09-24T20:10:00Z"));
    expect(r2.outcome).toBe("updated");
    expect(r2.toSend.map((t) => t.ballot.player)).toEqual(["Max Cobain"]);
    expect(r2.closesAt!.toISOString()).toBe(r.closesAt!.toISOString()); // the clock does not restart
    const view = await ballotView(tok("Phil Knott"), db, at("2026-09-24T20:11:00Z"));
    expect(view!.ballots.map((x) => x.player)).toEqual(["Max Cobain", "Phil Knott", "Seb Burgess"]);
    expect(view!.ballot.vote).toBeNull(); // his vote for Isaac went with Isaac
    expect(view!.ballots.find((x) => x.player === "Seb Burgess")!.voted).toBe(true);
    expect(view!.poll.candidates).toEqual(["Max Cobain", "Phil Knott", "Seb Burgess"]);
    const polls = await listMotmPolls(10, db);
    expect(polls[0]).toMatchObject({ matchId: id, status: "open", ballots: 3, voted: 1 });
    expect(polls.slice(1).every((p) => p.status !== "open")).toBe(true);
    // then it turns out we forfeited
    await recordScore({ matchId: id, ours: 0, theirs: 8, scorers: {}, assists: {}, played: ["Phil Knott"], motm: null, comment: null, forfeit: true }, "test", db);
    const r3 = await openMotmPoll(id, "test", db, at("2026-09-24T20:20:00Z"));
    expect(r3.outcome).toBe("cancelled");
    expect(await pollSummary(id, db)).toBeNull();
    expect(await castVote(tok("Seb Burgess"), "Phil Knott", db, at("2026-09-24T20:21:00Z"))).toMatchObject({ ok: false, closed: true });
    // and a real score later starts a fresh vote
    await recordScore({ matchId: id, ours: 2, theirs: 0, scorers: {}, assists: {}, played: ["Phil Knott", "Seb Burgess"], motm: null, comment: null }, "test", db);
    const r4 = await openMotmPoll(id, "test", db, at("2026-09-24T20:30:00Z"));
    expect(r4.outcome).toBe("opened"); expect(r4.toSend).toHaveLength(2);
    expect(r4.toSend.every((t) => t.ballot.token !== tok("Phil Knott") && t.ballot.token !== tok("Seb Burgess"))).toBe(true);
  });

  it("friendlies never get one", async () => {
    const data = await loadClubData(db);
    const fr = data.friendlies?.matches.find((x) => !x.played) ?? data.matches.find((x) => x.seasonId === "FR");
    if (!fr) return;
    await recordScore({ matchId: fr.id, ours: 4, theirs: 4, scorers: {}, assists: {}, played: ["Phil Knott", "Seb Burgess"], motm: null, comment: null }, "test", db);
    expect(await openMotmPoll(fr.id, "test", db)).toMatchObject({ outcome: "skipped", message: expect.stringContaining("riendlies") });
  });
});

describe("the ballot on screen", () => {
  it("renders every team-mate as a button and the voter as ineligible", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { MotmVote } = await import("@/components/motm-vote");
    const html = renderToStaticMarkup(createElement(MotmVote, { token: "tok123", voter: "Isaac Mond", candidates: cands, current: null, pick: "Phil Knott" }));
    expect(html.match(/<button/g)?.length).toBe(4);
    expect(html).toContain("you, sadly ineligible");
    expect(html).toContain("Tap to confirm");
    expect(html).toContain("2 goals");
  });
});
