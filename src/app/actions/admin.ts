"use server";
import { revalidatePath } from "next/cache";
import { currentMember, forgetMembers } from "@/lib/auth";
import { purge } from "@/lib/apply";
import { getData } from "@/lib/data";
import { clean, rosterName, validEmailAddress } from "@/lib/admin-validation";
import { addMember, applySubmission, deleteFixture, listMembers, rejectSubmission, removeMember, saveSquad, setAdmin, upsertFixture, upsertSeason } from "@/lib/writes";
import { sendReminderPreview, sendSquadReminders } from "@/lib/reminders";
import { log } from "@/lib/log";

/** Everything here is admin-only. Each action re-checks the session; the UI merely hides what it must not offer. */
export type ActionState = { ok: boolean; message: string } | null;

async function admin() {
  const s = await currentMember();
  if (!s?.member.admin) throw new Error("Admins only");
  return s;
}
const fail = (message: string): ActionState => ({ ok: false, message });

export async function approveSubmissionAction(id: number): Promise<ActionState> {
  const s = await admin();
  const done = await applySubmission(id, s.member.player);
  if (!done) return fail("That one has already been dealt with.");
  purge();
  log("submission.approved", { id, kind: done.kind, by: s.member.player });
  revalidatePath("/admin");
  return { ok: true, message: `Recorded: ${done.summary}` };
}
export async function rejectSubmissionAction(id: number): Promise<ActionState> {
  const s = await admin();
  await rejectSubmission(id, s.member.player);
  log("submission.rejected", { id, by: s.member.player });
  revalidatePath("/admin");
  return { ok: true, message: "Rejected. Nothing changed." };
}

export async function addMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const s = await admin();
  const email = clean(form.get("email"), 120).toLowerCase();
  if (!validEmailAddress(email)) return fail("That does not look like an email address.");
  const data = await getData();
  const roster = [...new Set([...data.players.map((p) => p.name), ...data.seasons.flatMap((x) => x.players)])];
  const player = rosterName(form.get("player"), roster);
  if (!player) return fail("Pick a player from the list.");
  await addMember(email, player, form.get("admin") === "on", s.email);
  forgetMembers();
  revalidatePath("/admin");
  log("member.added", { player, by: s.member.player });
  return { ok: true, message: `${email} can now sign in as ${player}.` };
}
export async function removeMemberAction(email: string): Promise<ActionState> {
  const s = await admin();
  if (email.toLowerCase() === s.email.toLowerCase()) return fail("You cannot remove your own address.");
  const rows = await listMembers();
  const target = rows.find((r) => r.email === email.toLowerCase());
  if (target?.admin && !rows.some((r) => r.admin && r.email !== target.email)) return fail("That is the only admin address. Make someone else an admin first.");
  await removeMember(email);
  forgetMembers();
  revalidatePath("/admin");
  return { ok: true, message: `${email} removed.` };
}

export async function saveSeasonAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await admin();
  const id = clean(form.get("id"), 6).toUpperCase();
  if (!/^S\d{1,2}$/.test(id)) return fail("Season ids look like S9.");
  const pitchCost = clean(form.get("pitchCost"), 10);
  if (pitchCost && !(Number(pitchCost) >= 0)) return fail("Pitch cost should be a number of pounds.");
  const venueUrlRaw = clean(form.get("venueUrl"), 300);
  let venueUrl: string | null = null;
  if (venueUrlRaw) { try { const u = new URL(venueUrlRaw); if (u.protocol !== "https:") throw new Error(); venueUrl = u.toString(); } catch { return fail("The venue link should be an https address."); } }
  await upsertSeason({
    id, number: Number(id.slice(1)), title: clean(form.get("title"), 120), venue: clean(form.get("venue"), 120), period: clean(form.get("period"), 60),
    pitchCost: pitchCost ? Number(pitchCost) : null, paidBy: clean(form.get("paidBy"), 60) || null, venueUrl,
  });
  purge(); revalidatePath("/admin");
  return { ok: true, message: `${id} saved.` };
}
export async function saveFixtureAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const s = await admin();
  const seasonId = clean(form.get("seasonId"), 6).toUpperCase();
  const gw = Number(clean(form.get("gw"), 3));
  if (!seasonId || !Number.isInteger(gw) || gw < 1 || gw > 60) return fail("Gameweek must be a number from 1 to 60.");
  const date = clean(form.get("date"), 10) || null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Date should be yyyy-mm-dd.");
  const kickOff = clean(form.get("kickOff"), 5) || null;
  if (kickOff && !/^\d{2}:\d{2}$/.test(kickOff)) return fail("Kick-off should be hh:mm.");
  const type = clean(form.get("type"), 20) || null;
  const cost = clean(form.get("matchCost"), 10);
  const id = clean(form.get("id"), 40) || undefined;
  try {
    await upsertFixture({ id, seasonId, gw, date, kickOff, opponent: clean(form.get("opponent"), 60) || "TBC", type, matchCost: cost ? Number(cost) : null }, s.email);
  } catch (err) { return fail(err instanceof Error ? err.message : "Could not save the fixture."); }
  purge(); revalidatePath("/admin");
  return { ok: true, message: `${seasonId} GW${gw} saved.` };
}
export async function deleteFixtureAction(id: string): Promise<ActionState> {
  await admin();
  await deleteFixture(id);
  purge(); revalidatePath("/admin");
  return { ok: true, message: "Fixture removed." };
}

export async function setAdminAction(player: string, makeAdmin: boolean): Promise<ActionState> {
  const s = await admin();
  const rows = await listMembers();
  const mine = rows.filter((r) => r.player === player);
  if (!mine.length) return fail(`${player} has no address on the list yet.`);
  if (!makeAdmin && !rows.some((r) => r.admin && r.player !== player)) return fail("That would leave the club with no admin. Make someone else an admin first.");
  await setAdmin(player, makeAdmin);
  forgetMembers();
  revalidatePath("/admin");
  log("member.admin", { player, admin: makeAdmin, by: s.member.player });
  return { ok: true, message: makeAdmin ? `${player} is now an admin.` : `${player} is no longer an admin.` };
}

export async function saveSquadAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const s = await admin();
  const matchId = clean(form.get("matchId"), 40);
  const data = await getData();
  const m = data.matches.find((x) => x.id === matchId);
  if (!m) return fail("Pick a fixture.");
  if (m.played) return fail("That game has been played; the line-up is recorded with the result.");
  const roster = new Set([...data.players.map((p) => p.name), ...data.seasons.flatMap((x) => x.players)]);
  const players = form.getAll("players").map(String).filter((p) => roster.has(p));
  if (players.length > 14) return fail("Fourteen is a lot of people for six-a-side.");
  await saveSquad(matchId, players, clean(form.get("note"), 400) || null, s.email);
  revalidatePath("/admin"); revalidatePath(`/matches/${matchId}`);
  log("squad.saved", { matchId, players: players.length, by: s.member.player });
  return { ok: true, message: players.length ? `Team sheet saved: ${players.length} for ${m.opponent}. Reminders go out the day before.` : `Team sheet cleared for ${m.opponent}.` };
}

export async function sendRemindersAction(matchId: string): Promise<ActionState> {
  const s = await admin();
  const r = await sendSquadReminders(matchId);
  revalidatePath("/admin");
  log("reminders.manual", { matchId, by: s.member.player, ...r });
  if (r.skipped) return fail(r.skipped);
  const parts = [r.sent.length ? `Sent to ${r.sent.length}: ${r.sent.join(", ")}.` : "Nobody could be emailed.", r.noEmail.length ? `No email on the members list for ${r.noEmail.join(", ")}: chase them in the group chat.` : "", r.failed.length ? `Failed for ${r.failed.join(", ")}.` : ""].filter(Boolean);
  return { ok: r.sent.length > 0, message: parts.join(" ") };
}

export async function previewReminderAction(matchId: string): Promise<ActionState> {
  const s = await admin();
  const r = await sendReminderPreview(matchId, s.email, s.member.player);
  log("reminders.preview", { matchId, by: s.member.player, ok: r.ok });
  return r;
}
