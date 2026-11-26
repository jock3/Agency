import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import { TOOLS } from "@/components/tools";
import Ticker from "@/components/Ticker";
import { currentUserWithTools } from "@/lib/access/current";
import { hiddenToolsFor } from "@/lib/access/server";
import ToolPicker from "@/components/ToolPicker";
import { ADMIN_ONLY, HIDDEN_TOOLS_COOKIE, TOOL_NAMES, isToolKey, parseHiddenTools, type ToolKey } from "@/lib/access/tools";

/** Vad varje verktyg gör, en rad. Nyckeln är verktygets adress. */
const DOES: Record<string, string> = {
  "/formatkoll": "Annonsen i varje format, med säkra zoner, före lansering.",
  "/social": "Granska inlägg före publicering och bygg annonser i varumärkets stil.",
  "/audit": "Betyg för synlighet i Google och i AI-svar, med åtgärder.",
  "/tillganglighet": "Kontroll mot WCAG 2.2 AA, med betyg och åtgärder i ordning.",
  "/todo": "Teamets deadlines och att göra.",
  "/kanban": "Korten i Jarvis som tavla. En flytt sparas direkt.",
};

export default async function HubPage({ searchParams }: { searchParams: Promise<{ nekad?: string }> }) {
  const [user, { nekad }, jar] = await Promise.all([currentUserWithTools(), searchParams, cookies()]);
  // Samma regel som menyn: verktygen användaren får använda, minus dem hon själv har dolt.
  const available = user ? TOOLS.filter((t) => (user.tools as string[]).includes(t.href.slice(1))) : TOOLS;
  const availableKeys = available.map((t) => t.href.slice(1) as ToolKey);
  const cookieValue = jar.get(HIDDEN_TOOLS_COOKIE)?.value;
  const saved = user ? await hiddenToolsFor(user, cookieValue).catch(() => parseHiddenTools(cookieValue)) : parseHiddenTools(cookieValue);
  const hidden = saved.filter((k) => availableKeys.includes(k));
  const tools = available.filter((t) => !hidden.includes(t.href.slice(1) as ToolKey));
  const denied = isToolKey(nekad) ? TOOL_NAMES[nekad] : null;
  const deniedAdminOnly = isToolKey(nekad) && ADMIN_ONLY.includes(nekad);

  return (
    <main className="flex-1 bg-gray-50">
      <section className="bg-gray-900 text-white">
        <div className="relative max-w-[1112px] mx-auto px-6 md:px-8 pt-14 pb-16 md:pt-24 md:pb-24">
          <p className="milou-kicker hub-fade">Milou AI-hub</p>
          <h1 className="milou-display mt-5 max-w-[16ch]">
            <span className="hub-band block">Milous AI-hub.</span>
            <span className="hub-band block text-blush" style={{ "--i": 1 } as React.CSSProperties}>
              Verktygen bakom era kampanjer.
            </span>
          </h1>
          <p className="hub-fade mt-6 text-lg md:text-xl md:leading-8 text-white/90 max-w-[46ch]">
            Här testar vi annonsformat, granskar inlägg, mäter hur synliga och tillgängliga sajter är och håller ordning
            på teamets uppgifter.
          </p>
          {tools.length > 0 && <Stamp count={tools.length} />}
        </div>
      </section>

      <Ticker items={tools.map((t) => t.label)} label="Dina verktyg" />

      <section className="max-w-[1112px] mx-auto px-6 md:px-8 pt-16 pb-24 md:pt-24 md:pb-32">
        <p className="milou-kicker !text-gray-600">Dina verktyg</p>
        <h2 className="milou-display-sm mt-3 text-gray-900">Välj ett verktyg</h2>

        {denied && (
          <p role="status" className="mt-8 bg-white border-l-4 border-milou-500 px-5 py-4 max-w-[70ch] text-gray-800">
            Du har inte tillgång till {denied}.{" "}
            {deniedAdminOnly ? "Det verktyget är bara för admin." : "Be en admin om åtkomst."}
          </p>
        )}
        {user && available.length > 0 && <ToolPicker available={availableKeys} hidden={hidden} />}
        {available.length === 0 ? (
          <p className="mt-8 bg-white px-5 py-6 max-w-[70ch] text-gray-800">Du har inga verktyg än. Be en admin om åtkomst.</p>
        ) : tools.length === 0 ? (
          <p className="mt-8 bg-white px-5 py-6 max-w-[70ch] text-gray-800">Du har dolt alla verktyg. Välj vilka du vill se ovan.</p>
        ) : (
          <ul className="mt-14 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-14 gap-y-20">
            {tools.map((t, i) => (
              <li key={t.href} className="milou-plate bg-white hub-capsule" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={t.href}
                  className="group h-full flex flex-col gap-5 p-7 md:p-8 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-milou-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="milou-num border border-milou-700 text-milou-700">{String(i + 1).padStart(2, "0")}</span>
                    <t.Icon aria-hidden className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-extrabold text-2xl leading-tight text-gray-900">{t.label}</h3>
                    <p className="mt-2 text-gray-600 leading-6">{DOES[t.href]}</p>
                  </div>
                  <span aria-hidden className="w-14 h-14 bg-milou-500 group-hover:bg-milou-600 transition-colors flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-white transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/** Rund stämpel med text runt kanten, som på milou.se:s tjänstesidor. Visar antalet verktyg. */
function Stamp({ count }: { count: number }) {
  return (
    <div aria-hidden className="hub-fade hidden lg:block absolute right-8 top-20 w-44 h-44 rounded-full bg-blush shadow-[10px_10px_0_0_#5B173C]">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <path id="stamp-circle" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
        </defs>
        <text className="fill-gray-900" style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-rem)" }}>
          <textPath href="#stamp-circle" textLength={446} lengthAdjust="spacing">
            MILOU AI-HUB · VERKTYG ·
          </textPath>
        </text>
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-plum"
          style={{ fontSize: 46, fontWeight: 800, fontFamily: "var(--font-rem)" }}
        >
          {String(count).padStart(2, "0")}
        </text>
      </svg>
    </div>
  );
}
