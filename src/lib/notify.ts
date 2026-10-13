import { Resend } from "resend";
import { SITE_URL } from "./config";

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
    ? `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/admin#pending" style="display:inline-block;background:#1f5135;color:#f5f1e8;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px">Review and approve</a></p>`
    : `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}" style="display:inline-block;background:#1f5135;color:#f5f1e8;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px">Open the site</a></p>`;
  const footer = input.applied ? `Recorded by ${esc(input.submittedBy)}. Already in the records; the site follows within a minute. This email is your copy.`
    : input.queued ? `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you approve it on the admin page.`
    : `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you apply this.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f1e8;color:#17221b;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64716a">${label} ${state} · Thameslink Hajduci</p>
    <h1 style="margin:0 0 14px;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.1">${esc(input.summary)}</h1>
    <pre style="white-space:pre-wrap;background:#fffcf6;border:1px solid rgba(23,34,27,.12);border-radius:10px;padding:14px;font-size:13px;line-height:1.5;color:#17221b">${esc(details)}</pre>
    ${cta}
    ${input.extra ? `<hr style="margin:26px 0;border:0;border-top:1px solid rgba(23,34,27,.12)"><p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64716a">${esc(input.extra.title)}</p>${input.extra.html}` : ""}
    <p style="margin:18px 0 0;font-size:12px;color:#64716a">${footer}</p>
  </div></body></html>`;
  const text = input.extra ? `${input.text}\n\n— ${input.extra.title} —\n${input.extra.text}` : input.text;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject: input.subject, html, text });
    if (error) { console.error("resend:", error); return false; }
    return true;
  } catch (err) { console.error("resend:", err); return false; }
}
