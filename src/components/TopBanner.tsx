"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MilouLogo from "./MilouLogo";

const SECTIONS = [
  { href: "/mediaplan", label: "Mediaplaner" },
  { href: "/kampanj", label: "Kampanjer" },
];

export default function TopBanner() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/login") || pathname.startsWith("/share");
  if (hidden) return null;

  return (
    <div className="bg-[#1C1C1C] text-white px-4 h-10 flex items-center justify-between text-sm shrink-0">
      <div className="flex items-center gap-5 min-w-0">
        <MilouLogo className="h-4 w-auto text-white shrink-0" />
        <nav className="flex items-center gap-1">
          {SECTIONS.map((s) => {
            const active = pathname.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  active ? "bg-milou-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <a href="/api/auth/logout" className="text-xs text-gray-400 hover:text-white transition-colors shrink-0">
        Logga ut
      </a>
    </div>
  );
}
