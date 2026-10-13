import { Resend } from "resend";
import { SITE_URL } from "./config";
import { BUTTON, CARD, EMAIL, EYEBROW, H1, emailClose, emailOpen } from "./email-styles";

/**
 * Email the admin about a submission. Provisioned through the Vercel Marketplace (Resend), which sets RESEND_API_KEY.
 * SCORE_TO_EMAIL is the recipient; SCORE_FROM_EMAIL the sender (must be on a domain verified in Resend, otherwise Resend's
 * default sender is used, which only delivers to the Resend account's own address). Returns false when not configured or on failure.
 */
/** `extra`: a section to carry inside this email (the recorder's own man-of-the-match ballot), so they get one message, not two. */
export async function emailSubmission(input: { subject: string; text: string; summary: string; submittedBy: string; kind: "score" | "payment" | "player"; applied: boolean; queued: boolean; extra?: { title: string; html: string; text: string } }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, to = process.env.SCORE_TO_EMAIL;
  if (!key || !to) return false;
  const from = process.env.SCORE_FROM_EMAIL ?? "Thameslink Hajduci <onboarding@resend.dev>";
  const label = input.kind === "payment" ? "Payment" : input.kind === "player" ? "New player" : "Score";
  const state = input.applied ? "recorded" : input.queued ? "to approve" : "submitted";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const details = input.text.split("\n\n")[0];
  const cta = input.queued
    ? `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/admin#pending" style="${BUTTON}">Review and approve</a></p>`
    : `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}" style="${BUTTON}">Open the site</a></p>`;
  const footer = input.applied ? `Recorded by ${esc(input.submittedBy)}. Already in the records; the site follows within a minute. This email is your copy.`
    : input.queued ? `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you approve it on the admin page.`
    : `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you apply this.`;
  const html = `${emailOpen()}
    <p style="margin:0 0 6px;${EYEBROW}">${label} ${state} · Thameslink Hajduci</p>
    <h1 style="margin:0 0 14px;${H1}">${esc(input.summary)}</h1>
    <pre style="margin:0;font-family:Inter,system-ui,sans-serif;white-space:pre-wrap;font-variant-numeric:tabular-nums;${CARD};padding:14px;font-size:13px;line-height:1.5;color:${EMAIL.ink}">${esc(details)}</pre>
    ${cta}
    ${input.extra ? `<hr style="margin:26px 0;border:0;border-top:1px solid ${EMAIL.line}"><p style="margin:0 0 6px;${EYEBROW}">${esc(input.extra.title)}</p>${input.extra.html}` : ""}
    <p style="margin:18px 0 0;font-size:12px;color:${EMAIL.muted}">${footer}</p>${emailClose}`;
  const text = input.extra ? `${input.text}\n\n— ${input.extra.title} —\n${input.extra.text}` : input.text;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject: input.subject, html, text });
    if (error) { console.error("resend:", error); return false; }
    return true;
  } catch (err) { console.error("resend:", err); return false; }
}
