"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/audit/extern", label: "Externt verktyg" },
  { href: "/audit/intern", label: "Internt verktyg" },
];

export default function AuditSubNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-gray-200 px-4 h-9 flex items-center shrink-0">
      <nav className="flex items-center gap-1">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                active ? "bg-peach text-gray-800" : "text-gray-500 hover:text-milou-500"
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
