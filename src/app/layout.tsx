import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thameslinkhajduci.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Thameslink Hajduci", template: "%s · Thameslink Hajduci" },
  description: "Squad, results, stats and questionable decisions from Thameslink Hajduci, a 6-a-side football club running slightly behind schedule since 2024.",
  openGraph: { title: "Thameslink Hajduci", description: "Forza Hajduci. Live from the spreadsheet.", type: "website", siteName: "Thameslink Hajduci", images: ["/crest.png"] },
  twitter: { card: "summary", title: "Thameslink Hajduci", description: "Forza Hajduci. Live from the spreadsheet.", images: ["/crest.png"] },
  icons: { icon: "/crest.png", apple: "/crest.png" },
};
export const viewport: Viewport = { themeColor: "#0d2b19" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
