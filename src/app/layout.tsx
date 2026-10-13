import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { MobileTabs, Nav } from "@/components/nav";
import { ScrollHints } from "@/components/scroll-hints";
import { Footer } from "@/components/footer";
import { authEnabled } from "@/lib/auth";

const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin", "latin-ext"], variable: "--font-serif", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thameslinkhajduci.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Thameslink Hajduci", template: "%s · Thameslink Hajduci" },
  description: "Thameslink Hajduci, a six-a-side football club in East London since 2024. The squad, every result, and the numbers behind them.",
  openGraph: { type: "website", siteName: "Thameslink Hajduci" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f1e8" }, { media: "(prefers-color-scheme: dark)", color: "#0d1511" }] };
/** ISR for every page: prerendered HTML is re-rendered at most once a minute. A literal, because Next reads it statically (REVALIDATE_SECONDS in lib/data.ts matches). */
export const revalidate = 60;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = authEnabled();
  return (
    <html lang="en" className={`${serif.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Nav authEnabled={auth} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 sm:pt-12 md:pb-20 lg:px-8">{children}</main>
        <Footer />
        <MobileTabs authEnabled={auth} />
        <ScrollHints />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
