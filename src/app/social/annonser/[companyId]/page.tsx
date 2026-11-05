import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, membersOf, memberCompany } from "@/lib/ads/access";

const STEPS = [
  { name: "Tillgångar", does: "Ladda upp bilder och PNG-mallar, med beskrivning och taggar." },
  { name: "Mallredigerare", does: "Markera var texten ska ligga på en mall, per format." },
  { name: "Komponering", does: "Bild, mall och text blir en färdig annons i 1:1, 4:5 och 9:16." },
  { name: "AI-val och text", does: "Skriv ett budskap, så väljer AI bild och mall och skriver texten." },
];

/**
 * Ett företags sida. Bara medlemmar kommer in: för alla andra, och för id:n som
 * inte finns, är svaret samma 404, så sidan avslöjar inte vilka företag som finns.
 */
export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;

  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  const members = await membersOf(company.id);

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <Link href="/social/annonser" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Alla företag
      </Link>
      <h2 className="text-2xl font-bold mt-3">{company.name}</h2>
      <p className="text-sm text-gray-600 mt-1">
        Medlemmar: {members.map((m) => m.name).join(", ") || "inga"}
      </p>

      <section className="mt-8">
        <h3 className="font-bold mb-2">Det här kommer härnäst</h3>
        <ol className="bg-white divide-y divide-gray-100 list-decimal list-inside">
          {STEPS.map((s) => (
            <li key={s.name} className="px-5 py-3">
              <b>{s.name}</b> <span className="text-gray-700">{s.does}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
