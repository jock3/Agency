import { notFound, redirect } from "next/navigation";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import AssetSection from "../AssetSection";

export const dynamic = "force-dynamic";

/** Mallarna med exempelposter. Bara medlemmar (annars 404). */
export default async function TemplatesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  const assets = await listAssets(company.id);
  return (
    <AssetSection
      companyId={company.id}
      kind="overlay"
      intro="PNG-splashar och banderoller som läggs ovanpå bilden. Lägg gärna till exempelposter på varje mall, så finns det kontext om hur den används. Markera textytorna och var mallen ligger i varje format under Markera textytor."
      items={assets.filter((a) => a.kind === "overlay")}
      empty="Inga mallar än."
      examplesOf={(id) => assets.filter((a) => a.kind === "example" && a.parent_id === id)}
    />
  );
}
