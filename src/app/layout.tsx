import type { Metadata } from "next";
import "./globals.css";
import TopBanner from "@/components/TopBanner";

export const metadata: Metadata = {
  title: "Milou Verktyg",
  description: "Mediaplaner och kampanjplaner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen flex flex-col">
        <TopBanner />
        <div className="flex-1 min-h-0">{children}</div>
      </body>
    </html>
  );
}
