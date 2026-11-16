import { notFound, redirect } from "next/navigation";
import MediaplanTabs from "@/components/MediaplanTabs";
import ReportEditor from "@/components/report/ReportEditor";
import { currentUser, isUuid, memberCompany } from "@/lib/ads/access";
import { normalizeDoc } from "@/lib/report/doc";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** En rapport i editorn. Bara medlemmar i rapportens företag: för alla andra, och för okända id:n, är svaret 404. */
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
    <div className="min-h-full">
      <MediaplanTabs />
      <ReportEditor id={data.id as string} initial={doc} />
    </div>
  );
}
