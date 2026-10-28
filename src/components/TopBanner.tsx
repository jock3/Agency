"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MilouLogo from "./MilouLogo";
import { TOOLS, type ToolLink } from "./tools";

// På smala skärmar visas bara ikonerna, så att alla verktyg får plats.
function NavLink({ href, label, Icon, active }: ToolLink & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
      className={`px-2.5 lg:px-3 h-8 flex items-center gap-2 whitespace-nowrap text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
        active ? "bg-peach text-gray-800" : "text-white hover:text-peach"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

export default function TopBanner() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/login") || pathname.startsWith("/share");
  if (hidden) return null;

  const link = (t: ToolLink) => <NavLink key={t.href} {...t} active={pathname.startsWith(t.href)} />;

  return (
    <div className="bg-gray-900 text-white h-14 flex items-center gap-4 md:gap-6 px-4 sm:px-8 shrink-0">
      <Link
        href="/"
        aria-label="Till AI-hubben"
        className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-peach"
      >
        <MilouLogo className="h-[18px] w-auto text-white" />
      </Link>
      <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TOOLS.filter((t) => !t.internal).map(link)}
      </nav>
      <div className="flex items-center gap-1 shrink-0">
        {TOOLS.filter((t) => t.internal).map(link)}
        <a href="/api/auth/logout" className="hidden md:block px-3 text-sm text-gray-400 hover:text-white transition-colors">
          Logga ut
        </a>
      </div>
    </div>
  );
}
