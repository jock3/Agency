import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { domainOf } from "@/lib/audit/projects";

interface Tool {
  href: string;
  name: string;
  does: string;
  fact: string | null;
  /** Kapselns färg och text, ur Milous palett. */
  tone: string;
  /** Förskjutning i höjdled på desktop, som tjänstekapslarna på milou.se. */
  offset: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * En levande uppgift per verktyg. Varje fråga får misslyckas för sig, så en
 * trasig tabell tar bara bort den raden och aldrig hela hubben.
 */
async function loadFacts() {
  const sb = getSupabaseAdminClient();
  const [plans, campaigns, formats, audit] = await Promise.allSettled([
    sb.from("media_plans").select("id", { count: "exact", head: true }).eq("archived", false),
    sb.from("campaign_plans").select("id", { count: "exact", head: true }).eq("archived", false),
    sb.from("formatkoll_projects").select("id", { count: "exact", head: true }),
    sb.from("audit_internal_runs").select("host, seo_score, geo_score").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const count = (r: typeof plans) => (r.status === "fulfilled" && r.value.count != null ? r.value.count : null);
  const p = count(plans);
  const c = count(campaigns);
  const f = count(formats);
  const a = audit.status === "fulfilled" ? audit.value.data : null;

  return {
    plans: p == null ? null : plural(p, "aktiv plan", "aktiva planer"),
    campaigns: c == null ? null : plural(c, "aktiv kampanjplan", "aktiva kampanjplaner"),
    formats: f == null ? null : plural(f, "projekt", "projekt"),
    audit: a ? `${domainOf(a.host)}\nSEO ${a.seo_score}, GEO ${a.geo_score}` : null,
  };
}

export default async function HubPage() {
  await connection();
  const facts = await loadFacts();

  const tools: Tool[] = [
    {
      href: "/mediaplan",
      name: "Mediaplaner",
      does: "Budget, kanaler och tidsplan per kund, med en vy kunden kan öppna via länk.",
      fact: facts.plans,
      tone: "bg-plum text-white",
      offset: "md:mt-0",
    },
    {
      href: "/kampanj",
      name: "Kampanjer",
      does: "Kampanjplaner per plattform med tidslinje och delbar kundvy.",
      fact: facts.campaigns,
      tone: "bg-blush text-gray-900",
      offset: "md:mt-16",
    },
    {
      href: "/formatkoll",
      name: "Formatkoll",
      does: "Se annonsen i varje format, med säkra zoner, innan den går ut.",
      fact: facts.formats,
      tone: "bg-peach text-gray-900",
      offset: "md:mt-6",
    },
    {
      href: "/audit",
      name: "SEO/GEO-audit",
      does: "Betyg för synlighet i Google och i AI-svar, med åtgärder i prioritetsordning.",
      fact: facts.audit,
      tone: "bg-beige text-gray-900",
      offset: "md:mt-24",
    },
  ];

  return (
    <main className="flex-1 bg-gray-50">
      <section className="bg-gray-900 text-white">
        <div className="max-w-[1112px] mx-auto px-6 md:px-8 pt-12 pb-16 md:pb-[220px] lg:grid lg:grid-cols-[auto_1fr] lg:gap-16 lg:items-end">
          {/* Ett band per rad, som hero-rubrikerna på milou.se. Raderna bryts
              för hand så att varje band blir en hel fras. */}
          <h1 className="font-display font-extrabold text-[34px] leading-[1.16] md:text-[64px] md:leading-[1.1] tracking-[-0.01em]">
            <span className="milou-band bg-plum">Milous AI-hub.</span>
            <br />
            <span className="milou-band bg-peach text-gray-900">Verktygen bakom</span>
            <br />
            <span className="milou-band bg-peach text-gray-900">era kampanjer.</span>
          </h1>
          <p className="mt-6 lg:mt-0 text-lg md:text-xl md:leading-8 text-gray-400 max-w-[34ch] lg:pb-1">
            Här planerar vi media, bygger kampanjer, testar annonsformat och mäter hur synliga ni är i sök och
            AI-svar.
          </p>
        </div>
      </section>

      <section className="max-w-[1112px] mx-auto px-6 md:px-8 -mt-8 md:-mt-[172px] pb-20">
        <ul className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-10 items-start">
          {tools.map((t, i) => (
            <li key={t.href} className={`hub-capsule ${t.offset}`} style={{ "--i": i } as React.CSSProperties}>
              <Link
                href={t.href}
                className={`group ${t.tone} rounded-[2.5rem] md:rounded-full flex md:flex-col items-center gap-5 md:gap-0 p-5 pl-8 md:px-7 md:pt-14 md:pb-7 md:h-[360px] md:text-center focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-milou-500`}
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-extrabold text-2xl md:text-[30px] md:leading-[34px]">{t.name}</h2>
                  <p className="mt-2 md:mt-4 text-sm md:text-base leading-6 opacity-80">{t.does}</p>
                  {t.fact && <p className="mt-3 md:mt-5 text-sm font-bold whitespace-pre-line">{t.fact}</p>}
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

        <p className="mt-12 md:mt-16 text-gray-600">
          <Link href="/todo" className="font-bold text-gray-900 underline underline-offset-4 decoration-peach decoration-2 hover:decoration-milou-500">
            Uppgifter
          </Link>{" "}
          är teamets tavla för deadlines och att göra.
        </p>
      </section>
    </main>
  );
}
