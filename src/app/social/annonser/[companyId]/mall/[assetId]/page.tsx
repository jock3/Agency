import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, isUuid, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import { emptyLayout } from "@/lib/ads/layout";
import LayoutEditor from "./LayoutEditor";

export const dynamic = "force-dynamic";

/** Mallredigeraren. Samma regel som företagssidan: icke-medlem och okänt id ger 404. */
export default async function TemplatePage({ params }: { params: Promise<{ companyId: string; assetId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId, assetId } = await params;

  const company = await memberCompany(user.user_id, companyId);
  if (!company || !isUuid(assetId)) notFound();
  const template = (await listAssets(company.id)).find((a) => a.id === assetId && a.kind === "overlay");
  if (!template || !template.url) notFound();

  return (
    <>
      <Link href={`/social/annonser/${company.id}/mallar`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Alla mallar
      </Link>
      <h3 className="text-xl font-bold mt-2">Mallredigerare</h3>
      <p className="text-sm text-gray-600 mt-1 max-w-[70ch]">
        Markera var texten ska ligga på mallen och var mallen ska sitta i varje format. AI:n kan bara välja mallar som har minst en textyta och en placering.
      </p>
      <LayoutEditor
        companyId={company.id}
        assetId={template.id}
        name={template.description || template.filename || "Mall"}
        imageUrl={template.url}
        initialAspect={template.width && template.height ? template.width / template.height : null}
        initial={template.layout ?? emptyLayout()}
      />
    </>
  );
}
