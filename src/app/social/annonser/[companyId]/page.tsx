import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, membersOf, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import { COMPANY_QUOTA_BYTES, formatBytes } from "@/lib/ads/asset-types";
import AssetCard from "./AssetCard";
import AssetUploader from "./AssetUploader";

export const dynamic = "force-dynamic";

const NEXT_STEPS = [
  { name: "Komponering", does: "Bild, mall och text blir en färdig annons i 1:1, 4:5 och 9:16." },
  { name: "AI-val och text", does: "Skriv ett budskap, så väljer AI bild och mall och skriver texten." },
];

/**
 * Ett företags sida med bildbanken. Bara medlemmar kommer in: för alla andra,
 * och för id:n som inte finns, är svaret samma 404, så sidan avslöjar inte
 * vilka företag som finns.
 */
export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;

  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  const [members, assets] = await Promise.all([membersOf(company.id), listAssets(company.id)]);

  const photos = assets.filter((a) => a.kind === "photo");
  const overlays = assets.filter((a) => a.kind === "overlay");
  const examplesOf = (templateId: string) => assets.filter((a) => a.kind === "example" && a.parent_id === templateId);
  const used = assets.reduce((s, a) => s + a.bytes, 0);

  const sections = [
    {
      kind: "photo" as const,
      title: `Bilder (${photos.length})`,
      intro: "Bildbanken som AI:n väljer ur. En bra beskrivning gör att rätt bild väljs.",
      items: photos,
      empty: "Inga bilder än.",
    },
    {
      kind: "overlay" as const,
      title: `Mallar (${overlays.length})`,
      intro: "PNG-splashar och banderoller som läggs ovanpå bilden. Lägg gärna till exempelposter på varje mall, så finns det kontext om hur den används. Markera textytorna och var mallen ligger i varje format under Markera textytor.",
      items: overlays,
      empty: "Inga mallar än.",
    },
  ];

  return (
    <main className="max-w-7xl w-full mx-auto px-6 py-8">
      <Link href="/social/annonser" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Alla företag
      </Link>
      <h2 className="text-2xl font-bold mt-3">{company.name}</h2>
      <p className="text-sm text-gray-600 mt-1">
        Medlemmar: {members.map((m) => m.name).join(", ") || "inga"} · Lagring: {formatBytes(used)} av {formatBytes(COMPANY_QUOTA_BYTES)}
      </p>

      {sections.map((s) => (
        <section key={s.kind} className="mt-10" aria-labelledby={`h-${s.kind}`}>
          <h3 id={`h-${s.kind}`} className="text-lg font-bold">
            {s.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3 max-w-[70ch]">{s.intro}</p>
          <AssetUploader companyId={company.id} kind={s.kind} />
          {s.items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">{s.empty}</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {s.items.map((a) => (
                <AssetCard key={a.id} companyId={company.id} asset={a} examples={a.kind === "overlay" ? examplesOf(a.id) : undefined} />
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="mt-12">
        <h3 className="font-bold mb-2">Det här kommer härnäst</h3>
        <ol className="bg-white divide-y divide-gray-100 list-decimal list-inside">
          {NEXT_STEPS.map((s) => (
            <li key={s.name} className="px-5 py-3">
              <b>{s.name}</b> <span className="text-gray-700">{s.does}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
