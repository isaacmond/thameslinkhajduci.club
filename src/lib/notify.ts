import { Resend } from "resend";
import { SITE_URL } from "./config";
import { BUTTON, CARD, EMAIL, EYEBROW, H1, LINE_SOFT, emailClose, emailOpen } from "./email-styles";

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
  // The plain-text message leads with a kind line and the summary, and ends with who sent it; the heading and footer
  // already say those, so the card carries only the details, one labelled row each.
  const [title, ...fixture] = input.summary.split(" · ");
  const rows = input.text.split("\n\n")[0].split("\n").slice(2).filter((l) => !l.startsWith("Submitted by "));
  const row = (l: string, i: number) => {
    const m = /^([A-Z][A-Za-z' ]{1,24}): (.+)$/.exec(l);
    const border = i ? `border-top:1px solid ${LINE_SOFT};` : "";
    return m
      ? `<tr><td style="${border}padding:11px 16px 9px 0;width:128px;vertical-align:top;${EYEBROW};line-height:20px">${esc(m[1])}</td><td style="${border}padding:10px 0;vertical-align:top;font-size:14px;line-height:20px;color:${EMAIL.ink}">${esc(m[2])}</td></tr>`
      : `<tr><td colspan="2" style="${border}padding:10px 0;font-size:14px;line-height:20px;color:${EMAIL.ink}">${esc(l)}</td></tr>`;
  };
  const cta = input.queued
    ? `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}/admin#pending" style="${BUTTON}">Review and approve</a></p>`
    : `<p style="margin:22px 0 0"><a href="${esc(SITE_URL)}" style="${BUTTON}">Open the site</a></p>`;
  const footer = input.applied ? `Recorded by ${esc(input.submittedBy)}. It is in the records, and the site updates within a minute. This email is your copy.`
    : input.queued ? `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you approve it on the admin page.`
    : `Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you apply this.`;
  const html = `${emailOpen()}
    <p style="margin:0 0 6px;${EYEBROW}">${label} ${state} · Thameslink Hajduci</p>
    <h1 style="margin:0;${H1}">${esc(title)}</h1>
    ${fixture.length ? `<p style="margin:6px 0 0;font-size:14px;color:${EMAIL.muted}">${esc(fixture.join(" · "))}</p>` : ""}
    ${rows.length ? `<div style="margin:18px 0 0;${CARD};padding:6px 20px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums">${rows.map(row).join("")}</table></div>` : ""}
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
