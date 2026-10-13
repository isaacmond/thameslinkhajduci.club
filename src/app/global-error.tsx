"use client";
import "./globals.css";

/* The theme values from globals.css, repeated here so the page keeps the club's colours in both themes even if the stylesheet fails to load. */
const THEME = `
.ge { --ge-paper: #f5f1e8; --ge-ink: #17221b; --ge-muted: #5b6861; --ge-accent: #1f5135; color-scheme: light; }
@media (prefers-color-scheme: dark) { .ge { --ge-paper: #0d1511; --ge-ink: #ebe6da; --ge-muted: #97a49b; --ge-accent: #82c79c; color-scheme: dark; } }
`;

/** Last-resort boundary (wraps the root layout), so even a layout failure looks like the club and not a stack trace. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className="ge">
      <head><style>{THEME}</style></head>
      <body style={{ background: "var(--ge-paper)", color: "var(--ge-ink)", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100dvh", display: "grid", placeItems: "center", margin: 0 }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ge-muted)", margin: 0, fontWeight: 600 }}>Thameslink Hajduci</p>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 52, margin: "10px 0", lineHeight: 1 }}>Something went wrong</h1>
          <p style={{ color: "var(--ge-muted)", lineHeight: 1.6 }}>The page couldn&apos;t be loaded. Please try again in a moment.</p>
          {error?.digest && <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "var(--ge-muted)" }}>Reference {error.digest}</p>}
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "var(--ge-accent)", color: "var(--ge-paper)", border: 0, borderRadius: 999, padding: "12px 22px", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
