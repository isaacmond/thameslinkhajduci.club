"use server";
import { revalidatePath } from "next/cache";
import { currentMember, forgetMembers } from "@/lib/auth";
import { purge } from "@/lib/apply";
import { getData } from "@/lib/data";
import { clean, rosterName, validEmailAddress } from "@/lib/admin-validation";
import { addMember, applySubmission, deleteFixture, rejectSubmission, removeMember, upsertFixture, upsertSeason } from "@/lib/writes";
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
  revalidatePath("/account");
  return { ok: true, message: `Recorded: ${done.summary}` };
}
export async function rejectSubmissionAction(id: number): Promise<ActionState> {
  const s = await admin();
  await rejectSubmission(id, s.member.player);
  log("submission.rejected", { id, by: s.member.player });
  revalidatePath("/account");
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
  revalidatePath("/account");
  log("member.added", { player, by: s.member.player });
  return { ok: true, message: `${email} can now sign in as ${player}.` };
}
export async function removeMemberAction(email: string): Promise<ActionState> {
  const s = await admin();
  if (email.toLowerCase() === s.email.toLowerCase()) return fail("You cannot remove your own address.");
  await removeMember(email);
  forgetMembers();
  revalidatePath("/account");
  return { ok: true, message: `${email} removed.` };
}

export async function saveSeasonAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await admin();
  const id = clean(form.get("id"), 6).toUpperCase();
  if (!/^S\d{1,2}$/.test(id)) return fail("Season ids look like S9.");
  const pitchCost = clean(form.get("pitchCost"), 10);
  const seasonCost = clean(form.get("seasonCost"), 10);
  await upsertSeason({
    id, number: Number(id.slice(1)), title: clean(form.get("title"), 120), venue: clean(form.get("venue"), 120), period: clean(form.get("period"), 60),
    pitchCost: pitchCost ? Number(pitchCost) : null, paidBy: clean(form.get("paidBy"), 60) || null, seasonCost: seasonCost ? Number(seasonCost) : 0,
  });
  purge(); revalidatePath("/account");
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
  purge(); revalidatePath("/account");
  return { ok: true, message: `${seasonId} GW${gw} saved.` };
}
export async function deleteFixtureAction(id: string): Promise<ActionState> {
  await admin();
  await deleteFixture(id);
  purge(); revalidatePath("/account");
  return { ok: true, message: "Fixture removed." };
}
