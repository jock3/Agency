import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import { currentUser, isUuid, memberCompany } from "@/lib/ads/access";
import { normalizeDoc } from "@/lib/report/doc";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import DeleteReportButton from "./DeleteReportButton";

export const dynamic = "force-dynamic";

/** En rapport. Bara medlemmar i rapportens företag: för alla andra, och för okända id:n, är svaret 404. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data } = await getSupabaseAdminClient().from("report_docs").select("id, company_id, doc").eq("id", id).maybeSingle();
  if (!data || !(await memberCompany(user.user_id, data.company_id as string))) notFound();
  const doc = normalizeDoc(data.doc);
  if (!doc) notFound();

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Mediaplan" description="Planer för budget, kanaler och tidsplan, och rapporter till kund när kampanjen är körd." />
      <MediaplanTabs />
      <main className="max-w-6xl w-full mx-auto px-6 py-8">
        <Link href="/mediaplan/rapport" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Alla rapporter
        </Link>
        <h2 className="text-2xl font-bold mt-3">{doc.meta.client}</h2>
        <p className="text-gray-600">{doc.meta.campaign}</p>
        <p className="bg-white px-5 py-6 text-gray-700 max-w-[70ch] mt-6">
          Rapporten är skapad och sparad ({doc.sections.length} {doc.sections.length === 1 ? "sida" : "sidor"}). Editorn där du bygger sidorna kommer i nästa steg.
        </p>
        <div className="mt-8">
          <DeleteReportButton id={data.id as string} />
        </div>
      </main>
    </div>
  );
}
