import type { Metadata } from "next";
import { isDemo } from "@/lib/audit/demo";
import AuditTool from "./AuditTool";

export const metadata: Metadata = {
  title: "Hur synlig är din sajt? — SEO- och GEO-koll | Milou",
  description: "Få ett betyg från 1 till 10 på hur väl din webbplats syns i Google och i AI-tjänster som ChatGPT.",
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return <AuditTool demo={isDemo()} />;
}
