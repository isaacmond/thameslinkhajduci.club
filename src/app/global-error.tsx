"use client";
import "./globals.css";

/** Last-resort boundary (wraps the root layout), so even a layout failure looks like the club and not a stack trace. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f5f1e8", color: "#17221b", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100dvh", display: "grid", placeItems: "center", margin: 0 }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64716a", margin: 0, fontWeight: 600 }}>Thameslink Hajduci</p>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 52, margin: "10px 0", lineHeight: 1 }}>Something went wrong</h1>
          <p style={{ color: "#64716a", lineHeight: 1.6 }}>The page couldn&apos;t be loaded. Please try again in a moment.</p>
          {error?.digest && <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#8a958e" }}>Reference {error.digest}</p>}
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "#1f5135", color: "#f5f1e8", border: 0, borderRadius: 999, padding: "12px 22px", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
