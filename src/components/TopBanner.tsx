"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MilouLogo from "./MilouLogo";

// Verktygen som visas för kunder. Uppgifter är internt och ligger till höger.
const TOOLS = [
  { href: "/mediaplan", label: "Mediaplaner" },
  { href: "/kampanj", label: "Kampanjer" },
  { href: "/formatkoll", label: "Formatkoll" },
  { href: "/audit", label: "SEO/GEO-audit" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-3 h-8 flex items-center whitespace-nowrap text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
        active ? "bg-peach text-gray-800" : "text-white hover:text-peach"
      }`}
    >
      {label}
    </Link>
  );
}

export default function TopBanner() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/login") || pathname.startsWith("/share");
  if (hidden) return null;

  return (
    <div className="bg-gray-900 text-white h-14 flex items-center gap-6 px-4 sm:px-8 shrink-0">
      <Link
        href="/"
        aria-label="Till AI-hubben"
        className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-peach"
      >
        <MilouLogo className="h-[18px] w-auto text-white" />
      </Link>
      <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TOOLS.map((t) => (
          <NavLink key={t.href} {...t} active={pathname.startsWith(t.href)} />
        ))}
      </nav>
      <div className="flex items-center gap-1 shrink-0">
        <NavLink href="/todo" label="Uppgifter" active={pathname.startsWith("/todo")} />
        <a href="/api/auth/logout" className="hidden md:block px-3 text-sm text-gray-400 hover:text-white transition-colors">
          Logga ut
        </a>
      </div>
    </div>
  );
}
