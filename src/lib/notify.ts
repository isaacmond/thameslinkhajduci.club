import { Resend } from "resend";
import { SITE_URL } from "./config";

/**
 * Email the admin about a submission. Provisioned through the Vercel Marketplace (Resend), which sets RESEND_API_KEY.
 * SCORE_TO_EMAIL is the recipient; SCORE_FROM_EMAIL the sender (must be on a domain verified in Resend, otherwise Resend's
 * default sender is used, which only delivers to the Resend account's own address). Returns false when not configured or on failure.
 */
export async function emailSubmission(input: { subject: string; text: string; summary: string; submittedBy: string; kind: "score" | "payment" | "player"; applied: boolean; queued: boolean }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, to = process.env.SCORE_TO_EMAIL;
  if (!key || !to) return false;
  const from = process.env.SCORE_FROM_EMAIL ?? "Thameslink Hajduci <onboarding@resend.dev>";
  const label = input.kind === "payment" ? "Payment" : input.kind === "player" ? "New player" : "Score";
  const state = input.applied ? "recorded" : input.queued ? "to approve" : "submitted";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const details = input.text.split("\n\n")[0];
  const cta = input.queued
    ? `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/admin#pending" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Review and approve</a></p>`
    : `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Open the site</a></p>`;
  const footer = input.applied ? `Recorded by ${esc(input.submittedBy)}. Already in the records; the site follows within a minute. This email is your copy.`
    : input.queued ? `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you approve it on the admin page.`
    : `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you apply this.`;
  const html = `<!doctype html><html><body style="margin:0;background:#06140c;color:#f6f1e6;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#a7b8ab">${label} ${state} · Thameslink Hajduci</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.1">${esc(input.summary)}</h1>
    <pre style="white-space:pre-wrap;background:#0d2b19;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px;font-size:13px;line-height:1.5;color:#f6f1e6">${esc(details)}</pre>
    ${cta}
    <p style="margin:18px 0 0;font-size:12px;color:#a7b8ab">${footer}</p>
  </div></body></html>`;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject: input.subject, html, text: input.text });
    if (error) { console.error("resend:", error); return false; }
    return true;
  } catch (err) { console.error("resend:", err); return false; }
}
