"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Flikarna i ett företag: annonsskaparen först, sedan materialet den bygger på. */
export default function CompanyTabs({ companyId, counts }: { companyId: string; counts: { photos: number; templates: number } }) {
  const pathname = usePathname();
  const base = `/social/annonser/${companyId}`;
  const tabs = [
    { href: base, label: "Skapa annons", active: pathname === base },
    { href: `${base}/bilder`, label: `Bilder (${counts.photos})`, active: pathname.startsWith(`${base}/bilder`) },
    { href: `${base}/mallar`, label: `Mallar (${counts.templates})`, active: pathname.startsWith(`${base}/mallar`) || pathname.startsWith(`${base}/mall/`) },
    { href: `${base}/material`, label: "Ton och bildspråk", active: pathname.startsWith(`${base}/material`) },
  ];
  return (
    <nav aria-label="Företagets delar" className="mt-4 flex flex-wrap gap-1 border-b border-gray-300">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`px-4 py-2 text-sm font-bold -mb-px border-b-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500 ${
            t.active ? "border-milou-500 text-gray-900 bg-white" : "border-transparent text-gray-600 hover:text-milou-500"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
