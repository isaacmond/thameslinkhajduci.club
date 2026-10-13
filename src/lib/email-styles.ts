import { OG } from "./og-font";

/**
 * Shared inline styles for the club's emails, built from the share-image palette (the site's light theme), so every email
 * has the same eyebrow, heading, card and button. Mail clients need inline styles, so these are plain style strings.
 */
export const EMAIL = OG;
/** A fainter rule than OG.line, for dividers inside a card. */
export const LINE_SOFT = "rgba(23,34,27,.08)";
/** The accent at a whisper, behind a note. */
export const ACCENT_TINT = "rgba(31,81,53,.06)";
export const EYEBROW = `font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:${OG.muted}`;
export const H1 = `font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:1.05;color:${OG.ink}`;
export const CARD = `background:${OG.surface};border:1px solid ${OG.line};border-radius:10px`;
export const BUTTON = `display:inline-block;background:${OG.accent};color:${OG.paper};font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px`;
export const LINK = `color:${OG.accent}`;
/** Opens every email: light only, so dark-mode clients do not invert the cream page into something unreadable. */
export const emailOpen = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:${OG.paper};color:${OG.ink};font-family:Inter,system-ui,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">`;
export const emailClose = "\n  </div></body></html>";
