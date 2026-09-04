import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { MobileTabs, Nav } from "@/components/nav";
import { ServiceTicker } from "@/components/ticker";
import { ScrollHints } from "@/components/scroll-hints";
import { Footer } from "@/components/footer";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thameslinkhajduci.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Thameslink Hajduci", template: "%s · Thameslink Hajduci" },
  description: "Squad, results, stats and questionable decisions from Thameslink Hajduci, a 6-a-side football club running slightly behind schedule since 2024.",
  openGraph: { type: "website", siteName: "Thameslink Hajduci" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#0d2b19" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Nav />
        <ServiceTicker />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-16 lg:px-8">{children}</main>
        <Footer />
        <MobileTabs />
        <ScrollHints />
      </body>
    </html>
  );
}
