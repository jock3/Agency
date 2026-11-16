import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { companiesOf, currentUser } from "@/lib/ads/access";

export const dynamic = "force-dynamic";

/** Rapportverktygets startsida: företagen du är medlem i (samma som i Annonsverktyget). */
export default async function ReportHomePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const mine = await companiesOf(user.user_id);

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold">Rapport</h2>
      <p className="text-sm text-gray-600 mt-1 max-w-[70ch]">
        Mata in siffror per plattform och få en rapport med räckvidd, exponeringar, klick, CTR, CPC och CPM. Välj företag.
      </p>
      <section className="mt-8">
        {mine.length === 0 ? (
          <p className="bg-white px-5 py-6 text-gray-700 max-w-[70ch]">
            Du är inte medlem i något företag än. Be en admin lägga till dig under Annonsverktyg.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/social/rapport/${c.id}`}
                  className="flex items-center gap-3 bg-white px-5 py-4 hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
                >
                  <Building2 className="w-5 h-5 text-milou-500 shrink-0" aria-hidden />
                  <span className="font-bold flex-1 min-w-0 truncate">{c.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
