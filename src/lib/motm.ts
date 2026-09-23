import { SITE_URL } from "./config";
import { fmtDate, gwLabel } from "./stats";

/**
 * The man-of-the-match vote, the pure half: who qualifies for one, who wins it, and the two emails. Nothing here touches the
 * database or Resend, so the tests and the previews use exactly what the players get. The database half is motm-polls.ts.
 */
export const MOTM_POLL_HOURS = 48;

export type MotmMatch = { id: string; seasonId: string; gw: number; opponent: string; date: string | null; ourGoals: number | null; theirGoals: number | null };
export type Candidate = { player: string; goals: number; assists: number };
export type BallotLine = { player: string; vote: string | null; votedAt: Date | null };
export type Count = { player: string; votes: number };

/**
 * A vote only makes sense for a league game we actually played, with at least two of us to choose between. Friendlies and
 * forfeits never count for records, so they never get one.
 */
export function pollEligible(m: { seasonId: string; type: string | null; ourGoals: number | null; theirGoals: number | null }, played: string[]): { ok: true } | { ok: false; reason: string } {
  if (m.ourGoals === null || m.theirGoals === null) return { ok: false, reason: "no score recorded" };
  if (m.seasonId === "FR" || /friendly/i.test(m.type ?? "")) return { ok: false, reason: "friendlies do not get a vote" };
  if (/forfeit/i.test(m.type ?? "")) return { ok: false, reason: "forfeits do not get a vote" };
  if (m.type) return { ok: false, reason: `${m.type} games do not count` };
  if (new Set(played).size < 2) return { ok: false, reason: "fewer than two players recorded" };
  return { ok: true };
}

/** Votes per candidate, most first. Ties are ordered the way decide() breaks them, so the list and the winner agree. */
export function tally(ballots: BallotLine[], candidates: Candidate[]): Count[] {
  const counts = new Map(candidates.map((c) => [c.player, 0]));
  for (const b of ballots) if (b.vote && counts.has(b.vote)) counts.set(b.vote, (counts.get(b.vote) ?? 0) + 1);
  const cmp = comparator(ballots, candidates);
  return [...counts.entries()].map(([player, votes]) => ({ player, votes })).sort((a, b) => cmp(a, b));
}

/**
 * Most votes wins. Level? Most goals in the game, then most assists, then whoever reached their total first (the earlier
 * final vote), then the alphabet, so the answer is always one name: the stats count MOTMs per player and cannot share one.
 */
export function decide(ballots: BallotLine[], candidates: Candidate[]): { winner: string | null; counts: Count[]; voted: number; tieBreak: "goals" | "assists" | "first" | "name" | null } {
  const counts = tally(ballots, candidates);
  const voted = ballots.filter((b) => b.vote).length;
  if (!counts.length || counts[0].votes === 0) return { winner: null, counts, voted, tieBreak: null };
  const top = counts.filter((c) => c.votes === counts[0].votes);
  if (top.length === 1) return { winner: top[0].player, counts, voted, tieBreak: null };
  const stat = (p: string) => candidates.find((c) => c.player === p) ?? { goals: 0, assists: 0 };
  const tieBreak = stat(top[0].player).goals !== stat(top[1].player).goals ? "goals" : stat(top[0].player).assists !== stat(top[1].player).assists ? "assists" : lastVote(ballots, top[0].player) !== lastVote(ballots, top[1].player) ? "first" : "name";
  return { winner: top[0].player, counts, voted, tieBreak };
}
const lastVote = (ballots: BallotLine[], player: string) => Math.max(0, ...ballots.filter((b) => b.vote === player && b.votedAt).map((b) => b.votedAt!.getTime()));
function comparator(ballots: BallotLine[], candidates: Candidate[]) {
  const stat = (p: string) => candidates.find((c) => c.player === p) ?? { goals: 0, assists: 0 };
  return (a: Count, b: Count) => b.votes - a.votes || stat(b.player).goals - stat(a.player).goals || stat(b.player).assists - stat(a.player).assists || (a.votes ? lastVote(ballots, a.player) - lastVote(ballots, b.player) : 0) || a.player.localeCompare(b.player);
}

/** "Thursday 20:15" in London time, for the "closes" line. */
export const fmtCloses = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(d).replace(",", "").replace(/ (\d)/, " $1");
export const scoreTitle = (m: MotmMatch) => `Hajduci ${m.ourGoals}–${m.theirGoals} ${m.opponent}`;
const fixtureLine = (m: MotmMatch) => `${m.seasonId} · ${gwLabel(m)} · ${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short" })}`;
const whatTheyDid = (c: Candidate) => [c.goals ? `${c.goals} goal${c.goals === 1 ? "" : "s"}` : "", c.assists ? `${c.assists} assist${c.assists === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
export const ballotUrl = (token: string, pick?: string) => `${SITE_URL}/motm/${token}${pick ? `?pick=${encodeURIComponent(pick)}` : ""}`;

const shell = (eyebrow: string, body: string) => `<!doctype html><html><body style="margin:0;background:#06140c;color:#f6f1e6;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#a7b8ab">${eyebrow} · Thameslink Hajduci</p>
    ${body}
    <p style="margin:22px 0 0;font-size:12px;color:#a7b8ab">You're getting this because you played, according to <a href="${esc(SITE_URL)}" style="color:#7fe0a3">thameslinkhajduci.club</a>. Running approximately twelve minutes behind schedule since 2024.</p>
  </div></body></html>`;

export type BallotEmailInput = { match: MotmMatch; voter: string; candidates: Candidate[]; token: string; closesAt: Date };
/** The ballot: one tap on a name opens the vote page with that name picked, one more confirms it. Nobody can vote for themselves. */
export function renderBallot({ match: m, voter, candidates, token, closesAt }: BallotEmailInput): { subject: string; html: string; text: string } {
  const first = voter.split(" ")[0];
  const options = candidates.filter((c) => c.player !== voter);
  const closes = fmtCloses(closesAt);
  const subject = `Man of the match vote: ${scoreTitle(m)}`;
  const rows = options.map((c) => `<tr><td style="padding:5px 0"><a href="${esc(ballotUrl(token, c.player))}" style="display:block;background:#0d2b19;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;color:#f6f1e6;text-decoration:none;font-size:15px;font-weight:600">${esc(c.player)}${whatTheyDid(c) ? ` <span style="color:#a7b8ab;font-weight:400;font-size:13px">· ${esc(whatTheyDid(c))}</span>` : ""}</a></td></tr>`).join("");
  const html = shell("Man of the match", `
    <h1 style="margin:0 0 6px;font-size:30px;line-height:1.05">${esc(scoreTitle(m))}</h1>
    <p style="margin:0 0 18px;font-size:14px;color:#a7b8ab">${esc(fixtureLine(m))}</p>
    <p style="margin:0 0 14px;font-size:17px;line-height:1.4">Who was the man of the match, ${esc(first)}? Tap a name.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin:18px 0 0"><a href="${esc(ballotUrl(token))}" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Open the ballot</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:#a7b8ab">Voting closes ${esc(closes)}, or sooner once everyone has voted. You can change your mind until then. Only the ${options.length + 1} who played get a vote, and you cannot vote for yourself. Nice try.</p>`);
  const text = [scoreTitle(m), fixtureLine(m), "", `Who was the man of the match, ${first}?`, "", ...options.map((c) => `  ${c.player}${whatTheyDid(c) ? ` (${whatTheyDid(c)})` : ""}: ${ballotUrl(token, c.player)}`), "", `Or open the ballot: ${ballotUrl(token)}`, "", `Voting closes ${closes}, or sooner once everyone has voted. You cannot vote for yourself.`].join("\n");
  return { subject, html, text };
}

export type ResultEmailInput = { match: MotmMatch; winner: string; counts: Count[]; ballots: number; reason: string };
/** The result, to everyone who had a ballot. */
export function renderResult({ match: m, winner, counts, ballots, reason }: ResultEmailInput): { subject: string; html: string; text: string } {
  const voted = counts.reduce((t, c) => t + c.votes, 0);
  const top = counts.find((c) => c.player === winner);
  const subject = `Man of the match: ${winner} · ${scoreTitle(m)}`;
  const how = reason === "everyone voted" ? "Everyone voted, so the poll closed early." : reason === "deadline" ? "Time was up." : `Closed by ${reason}.`;
  const tied = counts.filter((c) => c.votes === (top?.votes ?? 0) && c.player !== winner);
  const rows = counts.filter((c) => c.votes > 0).map((c) => `<tr><td style="padding:6px 10px;${c.player === winner ? "color:#f4c81b;font-weight:700" : ""}">${esc(c.player)}</td><td style="padding:6px 10px;text-align:right;font-family:ui-monospace,Menlo,monospace;color:${c.player === winner ? "#f4c81b" : "#a7b8ab"}">${c.votes}</td></tr>`).join("");
  const html = shell("Man of the match", `
    <h1 style="margin:0 0 6px;font-size:30px;line-height:1.05"><span style="color:#f4c81b">★</span> ${esc(winner)}</h1>
    <p style="margin:0 0 18px;font-size:14px;color:#a7b8ab">${esc(scoreTitle(m))} · ${esc(fixtureLine(m))}</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.4">${top?.votes ?? 0} of ${voted} vote${voted === 1 ? "" : "s"}${tied.length ? `, level with ${esc(tied.map((c) => c.player).join(" and "))} and ahead on what happened in the game` : ""}. ${voted} of ${ballots} ballot${ballots === 1 ? "" : "s"} came back. ${how}</p>
    <table style="width:100%;border-collapse:collapse;background:#0d2b19;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:14px">${rows}</table>
    <p style="margin:18px 0 0"><a href="${esc(SITE_URL)}/matches/${esc(m.id)}" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Match page</a></p>`);
  const text = [`Man of the match: ${winner}`, `${scoreTitle(m)} · ${fixtureLine(m)}`, "", `${top?.votes ?? 0} of ${voted} votes${tied.length ? `, level with ${tied.map((c) => c.player).join(" and ")} and ahead on what happened in the game` : ""}. ${voted} of ${ballots} ballots came back. ${how}`, "", ...counts.filter((c) => c.votes > 0).map((c) => `  ${c.player}: ${c.votes}`), "", `${SITE_URL}/matches/${m.id}`].join("\n");
  return { subject, html, text };
}
