import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Tool {
  href: string;
  name: React.ReactNode;
  does: string;
  /** Kapselns färg och text, ur Milous palett. */
  tone: string;
  /** Förskjutning i höjdled på desktop, som tjänstekapslarna på milou.se. */
  offset: string;
}

const TOOLS: Tool[] = [
  {
    href: "/mediaplan",
    name: "Mediaplaner",
    does: "Budget, kanaler och tidsplan i en vy.",
    tone: "bg-plum text-white",
    offset: "md:mt-0",
  },
  {
    href: "/kampanj",
    name: "Kampanjer",
    does: "Kampanjplaner per plattform, med tidslinje.",
    tone: "bg-blush text-gray-900",
    offset: "md:mt-12",
  },
  {
    href: "/formatkoll",
    name: "Formatkoll",
    does: "Annonsen i rätt format, före lansering.",
    tone: "bg-peach text-gray-900",
    offset: "md:mt-4",
  },
  {
    href: "/audit",
    // Bryts efter snedstrecket, aldrig vid bindestrecket (U+2011).
    name: (
      <>
        SEO/<wbr />
        GEO‑audit
      </>
    ),
    does: "Synlighet i Google och i AI-svar.",
    tone: "bg-beige text-gray-900",
    offset: "md:mt-20",
  },
  {
    href: "/todo",
    name: "Uppgifter",
    does: "Teamets deadlines och att göra.",
    tone: "bg-white text-gray-900",
    offset: "md:mt-8",
  },
];

export default function HubPage() {
  return (
    <main className="flex-1 bg-gray-50">
      <section className="bg-gray-900 text-white">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-12 pb-16 md:pb-[210px] lg:grid lg:grid-cols-[auto_1fr] lg:gap-16 lg:items-end">
          {/* Ett band per rad, som hero-rubrikerna på milou.se. Raderna bryts
              för hand så att varje band blir en hel fras, och radavståndet
              lämnar en springa mellan banden. */}
          <h1 className="font-display font-extrabold text-[34px] leading-[1.4] md:text-[64px] md:leading-[1.34] tracking-[-0.01em]">
            <span className="milou-band bg-plum">Milous AI-hub.</span>
            <br />
            <span className="milou-band bg-peach text-gray-900">Verktygen bakom</span>
            <br />
            <span className="milou-band bg-peach text-gray-900">era kampanjer.</span>
          </h1>
          <p className="mt-6 lg:mt-0 text-lg md:text-xl md:leading-8 text-gray-400 max-w-[34ch] lg:pb-2">
            Här planerar vi media, bygger kampanjer, testar annonsformat och mäter hur synliga ni är i sök och
            AI-svar.
          </p>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-6 md:px-8 -mt-8 md:-mt-[160px] pb-24">
        <ul className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 items-start">
          {TOOLS.map((t, i) => (
            <li key={t.href} className={`hub-capsule ${t.offset}`} style={{ "--i": i } as React.CSSProperties}>
              <Link
                href={t.href}
                className={`group ${t.tone} rounded-[2.5rem] md:rounded-full flex md:flex-col items-center gap-6 md:gap-0 py-7 pl-9 pr-6 md:px-8 md:pt-16 md:pb-9 md:h-[340px] md:text-center focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-milou-500`}
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-extrabold text-2xl leading-tight md:text-[26px] md:leading-[1.2]">{t.name}</h2>
                  <p className="mt-2 md:mt-5 text-sm md:text-base leading-6 opacity-80">{t.does}</p>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 w-14 h-14 bg-milou-500 group-hover:bg-milou-600 transition-colors flex items-center justify-center"
                >
                  <ArrowRight className="w-6 h-6 text-white" strokeWidth={1.5} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
