import { notFound, redirect } from "next/navigation";
import { currentUser, memberCompany } from "@/lib/ads/access";

export const dynamic = "force-dynamic";

const COMING = [
  { name: "Skrivguide", does: "Hur företaget låter: tilltal, ton, ord ni använder och aldrig använder, rubriklängd och hur erbjudanden skrivs. Copywritern skriver efter den och QA granskar mot den." },
  { name: "Förebilder", does: "Annonser ni gillar, markerade som \"så här vill vi låta\". De följer med som exempel när AI:n skriver." },
  { name: "Bildspråk", does: "Referensbilder och en beskrivning av stil, ljus och motiv. Styr både vilken bild som väljs ur banken och hur nya bilder skapas." },
];

/** Ton och bildspråk. Byggs i nästa steg; sidan visar vad som kommer. Bara medlemmar (annars 404). */
export default async function MaterialPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  if (!(await memberCompany(user.user_id, companyId))) notFound();
  return (
    <section aria-label="Ton och bildspråk">
      <p className="text-sm text-gray-600 max-w-[70ch]">
        Här samlas materialet som lär AI:n hur företaget skriver och vilket bildspråk det har. Det byggs i nästa steg.
      </p>
      <ul className="mt-4 bg-white divide-y divide-gray-100 max-w-[80ch]">
        {COMING.map((c) => (
          <li key={c.name} className="px-5 py-3 text-sm">
            <b>{c.name}</b> <span className="text-gray-700">– {c.does}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
