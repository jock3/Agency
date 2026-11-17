"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionTab {
  href: string;
  label: string;
  /** Aktiv bara på exakt den här sökvägen, för en flik vars adress är början på en annan. */
  exact?: boolean;
  /** Aktiv på sökvägen och allt under den, utom de här adresserna. */
  except?: string[];
}

/** Flikraden under sidhuvudet i en sektion med flera verktyg, till exempel SEO/GEO-audit. */
export default function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-gray-200 px-4 h-9 flex items-center shrink-0">
      <nav aria-label={label} className="flex items-center gap-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href) && !(t.except ?? []).some((e) => pathname.startsWith(e));
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                active ? "bg-peach text-gray-800" : "text-gray-600 hover:text-milou-500"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
