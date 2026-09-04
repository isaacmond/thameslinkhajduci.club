"use client";
import "./globals.css";

/** Last-resort boundary (wraps the root layout), so even a layout failure looks like the club and not a stack trace. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#06140c", color: "#f6f1e6", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100dvh", display: "grid", placeItems: "center", margin: 0 }}>
        <div style={{ maxWidth: 560, padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#a7b8ab", margin: 0 }}>Signalling failure</p>
          <h1 style={{ fontFamily: "Bebas Neue, Impact, sans-serif", fontSize: 56, margin: "8px 0", lineHeight: 1 }}>All services suspended</h1>
          <p style={{ color: "#a7b8ab" }}>Something broke while laying out the page. Usually a refresh fixes it; if not, the admin will hear about it.</p>
          {error?.digest && <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#6d7f72" }}>ref {error.digest}</p>}
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "#32c364", color: "#06140c", border: 0, borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
