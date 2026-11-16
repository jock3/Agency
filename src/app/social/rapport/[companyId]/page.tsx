import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileBarChart } from "lucide-react";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import NewReportForm from "./NewReportForm";

export const dynamic = "force-dynamic";

/** Företagets rapporter. Bara medlemmar: för alla andra är svaret 404. */
export default async function CompanyReportsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();

  const { data } = await getSupabaseAdminClient()
    .from("ad_reports")
    .select("id, title, period_start, period_end")
    .eq("company_id", company.id)
    .order("period_start", { ascending: false });
  const reports = (data ?? []) as { id: string; title: string; period_start: string; period_end: string }[];

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <Link href="/social/rapport" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Alla företag
      </Link>
      <h2 className="text-2xl font-bold mt-3">{company.name}: rapporter</h2>

      <div className="mt-6">
        <NewReportForm companyId={company.id} />
      </div>

      <section className="mt-8">
        <h3 className="font-bold mb-2">Rapporter ({reports.length})</h3>
        {reports.length === 0 ? (
          <p className="bg-white px-5 py-6 text-gray-700 max-w-[70ch]">Inga rapporter än. Skapa den första ovan.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/social/rapport/${company.id}/${r.id}`}
                  className="flex items-center gap-3 bg-white px-5 py-4 hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
                >
                  <FileBarChart className="w-5 h-5 text-milou-500 shrink-0" aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="font-bold block truncate">{r.title}</span>
                    <span className="text-xs text-gray-600">
                      {r.period_start} – {r.period_end}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
