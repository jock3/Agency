import { notFound, redirect } from "next/navigation";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import AssetSection from "../AssetSection";

export const dynamic = "force-dynamic";

/** Bildbanken. Bara medlemmar (annars 404). */
export default async function PhotosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  const photos = (await listAssets(company.id)).filter((a) => a.kind === "photo");
  return (
    <AssetSection
      companyId={company.id}
      kind="photo"
      intro="Bildbanken som AI:n väljer ur. En bra beskrivning gör att rätt bild väljs. Bilder som AI:n skapar hamnar också här, med taggen ai-genererad."
      items={photos}
      empty="Inga bilder än."
    />
  );
}
