import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DesignCheck from "./DesignCheck";

/** Tillgänglighetskoll på en design i Figma, före bygget. */
export default function DesignPage() {
  return (
    <>
      <PageHeader
        title="Testa design"
        description="Klistra in en Figma-länk. Färgkontrast och mått mäts i kod, och AI bedömer det som går att se i bilden."
      />
      <main className="max-w-6xl w-full mx-auto px-6 py-8">
        <Link href="/tillganglighet" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
          <ArrowLeft className="w-4 h-4" /> Tillbaka
        </Link>
        <DesignCheck />
      </main>
    </>
  );
}
