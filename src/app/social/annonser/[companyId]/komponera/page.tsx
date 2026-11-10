import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import { readiness } from "@/lib/ads/layout";
import Composer from "./Composer";

export const dynamic = "force-dynamic";

/** Komponering för hand: välj bild och mall, skriv texten, ladda ner PNG. Bara medlemmar (annars 404). */
export default async function ComposePage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();

  const assets = await listAssets(company.id);
  const photos = assets
    .filter((a) => a.kind === "photo" && a.url)
    .map((a) => ({ id: a.id, url: a.url!, label: a.description || a.filename || "Bild" }));
  const templates = assets
    .filter((a) => a.kind === "overlay" && a.url && a.layout && readiness(a.layout).ready)
    .map((a) => ({ id: a.id, url: a.url!, label: a.description || a.filename || "Mall", layout: a.layout! }));
  const unfinished = assets.filter((a) => a.kind === "overlay" && !readiness(a.layout).ready).length;

  return (
    <main className="max-w-7xl w-full mx-auto px-6 py-8">
      <Link href={`/social/annonser/${company.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> {company.name}
      </Link>
      <h2 className="text-2xl font-bold mt-3">Skapa annons</h2>
      <p className="text-sm text-gray-600 mt-1 max-w-[70ch]">
        Skriv ett budskap så föreslår AI bild, mall och text, eller välj och skriv själv. Allt går att ändra innan du laddar ner annonsen som PNG. Texten krymps automatiskt så att den ryms i mallens textyta.
      </p>
      {photos.length === 0 || templates.length === 0 ? (
        <p className="mt-6 bg-white p-5 text-sm max-w-[70ch]">
          {photos.length === 0 && "Det finns inga bilder i bildbanken än. "}
          {templates.length === 0 && "Det finns ingen färdig mall än: en mall behöver minst en textyta och en placering i något format. "}
          {unfinished > 0 && `${unfinished} mall${unfinished === 1 ? "" : "ar"} saknar layout.`}{" "}
          <Link href={`/social/annonser/${company.id}`} className="font-bold underline">
            Till bildbanken
          </Link>
        </p>
      ) : (
        <Composer companyId={company.id} photos={photos} templates={templates} />
      )}
    </main>
  );
}
