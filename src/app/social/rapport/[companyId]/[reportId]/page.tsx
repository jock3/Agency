import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, isUuid, memberCompany } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReportRow } from "@/lib/social/report";
import ReportEditor from "./ReportEditor";

export const dynamic = "force-dynamic";

/** En rapport. Rapporten måste höra till företaget i adressen och användaren vara medlem, annars 404. */
export default async function ReportPage({ params }: { params: Promise<{ companyId: string; reportId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId, reportId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company || !isUuid(reportId)) notFound();

  const { data } = await getSupabaseAdminClient()
    .from("ad_reports")
    .select("id, title, period_start, period_end, rows")
    .eq("id", reportId)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <Link href={`/social/rapport/${company.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> {company.name}: rapporter
      </Link>
      <ReportEditor
        companyId={company.id}
        report={{ id: data.id as string, title: data.title as string, periodStart: data.period_start as string, periodEnd: data.period_end as string, rows: (data.rows ?? []) as ReportRow[] }}
      />
    </main>
  );
}
