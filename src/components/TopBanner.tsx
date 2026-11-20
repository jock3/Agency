"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb, Library, SlidersHorizontal } from "lucide-react";
import type { AppUser } from "@/lib/types";
import MilouLogo from "./MilouLogo";
import { HIDDEN_TOOLS_COOKIE, HIDDEN_TOOLS_EVENT, parseHiddenTools } from "@/lib/access/tools";
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
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

export default function TopBanner() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/login") || pathname.startsWith("/share");
  const [user, setUser] = useState<AppUser | null>(null);

  // Hämtas om vid inloggning och efter ändringar i kontrollcentret (sidbyte).
  useEffect(() => {
    if (hidden) return;
    let live = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => live && setUser(data.user ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [hidden, pathname]);

  // Ritar om menyn när verktygsväljaren på startsidan ändrar kakan.
  const [, setPickerTick] = useState(0);
  useEffect(() => {
    const onChange = () => setPickerTick((n) => n + 1);
    window.addEventListener(HIDDEN_TOOLS_EVENT, onChange);
    return () => window.removeEventListener(HIDDEN_TOOLS_EVENT, onChange);
  }, []);

  if (hidden) return null;

  // Menyn visas först när åtkomsten är känd, så att ingen ser verktyg hon inte får öppna.
  // Verktyg användaren själv har dolt (startsidans verktygsväljare) visas inte heller,
  // utom det verktyg hon står i just nu.
  const hiddenTools: string[] =
    typeof document === "undefined"
      ? []
      : parseHiddenTools(document.cookie.match(new RegExp(`(?:^|; )${HIDDEN_TOOLS_COOKIE}=([^;]*)`))?.[1]);
  const tools = user?.tools
    ? TOOLS.filter(
        (t) => user.tools!.includes(t.href.slice(1)) && (!hiddenTools.includes(t.href.slice(1)) || pathname.startsWith(t.href)),
      )
    : [];

  return (
    <div className="bg-gray-900 text-white h-14 flex items-center gap-4 md:gap-6 px-4 sm:px-8 shrink-0">
      {!pathname.startsWith("/audit/intern") && (
        <Link
          href="/"
          aria-label="Till AI-hubben"
          className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-peach"
        >
          <MilouLogo className="h-[18px] w-auto text-white" />
        </Link>
      )}
      <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {tools.map((t) => (
          <NavLink key={t.href} {...t} active={pathname.startsWith(t.href)} />
        ))}
      </nav>
      {user && (
        <Link
          href="/resurser"
          aria-current={pathname.startsWith("/resurser") ? "page" : undefined}
          aria-label="Resurser"
          title="Resurser"
          className={`shrink-0 h-8 px-2.5 flex items-center gap-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
            pathname.startsWith("/resurser") ? "bg-peach text-gray-800" : "text-gray-400 hover:text-white"
          }`}
        >
          <Library className="w-4 h-4" aria-hidden />
          <span className="hidden 2xl:inline">Resurser</span>
        </Link>
      )}
      {user && (
        <Link
          href="/forslag"
          aria-current={pathname.startsWith("/forslag") ? "page" : undefined}
          aria-label="Förslag"
          title="Förslag"
          className={`shrink-0 h-8 px-2.5 flex items-center gap-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
            pathname.startsWith("/forslag") ? "bg-peach text-gray-800" : "text-gray-400 hover:text-white"
          }`}
        >
          <Lightbulb className="w-4 h-4" aria-hidden />
          <span className="hidden 2xl:inline">Förslag</span>
        </Link>
      )}
      {user?.isAdmin && (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          aria-label="Kontrollcenter"
          title="Kontrollcenter"
          className={`shrink-0 h-8 px-2.5 flex items-center gap-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
            pathname.startsWith("/admin") ? "bg-peach text-gray-800" : "text-gray-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden />
          <span className="hidden 2xl:inline">Kontrollcenter</span>
        </Link>
      )}
      <a href="/api/auth/logout" className="hidden md:block shrink-0 px-3 text-sm text-gray-400 hover:text-white transition-colors">
        Logga ut
      </a>
    </div>
  );
}
