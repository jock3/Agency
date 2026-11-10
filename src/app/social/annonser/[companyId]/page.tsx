import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import { readiness } from "@/lib/ads/layout";
import Composer from "./Composer";

export const dynamic = "force-dynamic";

/** Företagets startsida: annonsskaparen. Bara medlemmar (annars 404). */
export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
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
  const base = `/social/annonser/${company.id}`;

  if (photos.length === 0 || templates.length === 0)
    return (
      <div className="bg-white p-5 text-sm max-w-[70ch] flex flex-col gap-2">
        <p className="font-bold">Annonsskaparen behöver minst en bild och en färdig mall.</p>
        {photos.length === 0 && (
          <p>
            Det finns inga bilder i bildbanken än.{" "}
            <Link href={`${base}/bilder`} className="font-bold underline hover:text-milou-500">
              Ladda upp bilder
            </Link>
          </p>
        )}
        {templates.length === 0 && (
          <p>
            Det finns ingen färdig mall än: en mall behöver minst en textyta och en placering i något format.
            {unfinished > 0 && ` ${unfinished} mall${unfinished === 1 ? "" : "ar"} saknar layout.`}{" "}
            <Link href={`${base}/mallar`} className="font-bold underline hover:text-milou-500">
              Till mallarna
            </Link>
          </p>
        )}
      </div>
    );

  return (
    <>
      <p className="text-sm text-gray-600 max-w-[70ch]">
        Skriv ett budskap så skapar AI:n annonsen, eller välj bild, mall och text själv. Allt går att ändra innan du laddar ner annonsen som PNG.
      </p>
      <Composer companyId={company.id} photos={photos} templates={templates} />
    </>
  );
}
