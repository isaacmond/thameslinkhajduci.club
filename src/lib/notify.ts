import { Resend } from "resend";

/**
 * Email the admin about a score submission. Provisioned through the Vercel Marketplace (Resend), which sets RESEND_API_KEY.
 * SCORE_TO_EMAIL is the recipient; SCORE_FROM_EMAIL the sender (must be on a domain verified in Resend, otherwise Resend's
 * test sender is used, which only delivers to the Resend account's own address). Returns false when not configured or on failure.
 */
export async function emailScoreSubmission(input: { subject: string; text: string; summary: string; edits: { cell: string; value: string | number; what: string }[]; tab: string | null; sheetUrl: string; submittedBy: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, to = process.env.SCORE_TO_EMAIL;
  if (!key || !to) return false;
  const from = process.env.SCORE_FROM_EMAIL ?? "Thameslink Hajduci <onboarding@resend.dev>";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const rows = input.edits.map((e) => `<tr><td style="padding:4px 10px;font-family:ui-monospace,Menlo,monospace;color:#f4c81b">${esc(e.cell)}</td><td style="padding:4px 10px;font-family:ui-monospace,Menlo,monospace">${esc(String(e.value))}</td><td style="padding:4px 10px;color:#a7b8ab">${esc(e.what)}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#06140c;color:#f6f1e6;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#a7b8ab">Score submission · Thameslink Hajduci</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.1">${esc(input.summary)}</h1>
    <pre style="white-space:pre-wrap;background:#0d2b19;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px;font-size:13px;line-height:1.5;color:#f6f1e6">${esc(input.text.split("\n\n")[0])}</pre>
    <h2 style="margin:22px 0 8px;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#a7b8ab">Cells to change${input.tab ? ` · tab ${esc(input.tab)}` : ""}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;background:#0d2b19;border-radius:10px">${rows || '<tr><td style="padding:8px 10px;color:#a7b8ab">Could not map cells, apply by hand.</td></tr>'}</table>
    <p style="margin:22px 0 0"><a href="${esc(input.sheetUrl)}" style="display:inline-block;background:#32c364;color:#06140c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Open the records</a></p>
    <p style="margin:18px 0 0;font-size:12px;color:#a7b8ab">Submitted by ${esc(input.submittedBy)}. Nothing changes on the site until you apply this.</p>
  </div></body></html>`;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject: input.subject, html, text: input.text });
    if (error) { console.error("resend:", error); return false; }
    return true;
  } catch (err) { console.error("resend:", err); return false; }
}
