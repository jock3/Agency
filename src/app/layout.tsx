import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopBanner from "@/components/TopBanner";

export const metadata: Metadata = {
  title: "Milou Verktyg",
  description: "Mediaplaner och kampanjplaner",
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
    <html lang="sv">
      <body className="min-h-screen flex flex-col">
        <TopBanner />
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
