import type { Metadata, Viewport } from "next";
import { REM } from "next/font/google";
import "./globals.css";
import TopBanner from "@/components/TopBanner";

// REM bär all fetstil. Repot har bara Komet Regular, så fet Komet blev en
// webbläsarsyntetiserad, grötig fetstil. Se globals.css.
const rem = REM({ subsets: ["latin"], variable: "--font-rem", display: "swap" });

export const metadata: Metadata = {
  title: "Milou AI-hub",
  description: "Milous verktyg för mediaplaner, kampanjer, annonsformat och synlighet i sök och AI-svar",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Uppgifter",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C1C1C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={rem.variable}>
      <body className="min-h-screen flex flex-col">
        <TopBanner />
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
