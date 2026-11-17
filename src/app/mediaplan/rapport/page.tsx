import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileBarChart } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import { companiesOf, currentUser } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import TagChips from "@/components/shared/TagChips";
import NewReportForm from "./NewReportForm";

export const dynamic = "force-dynamic";

/** Rapporterna i de företag du är medlem i (samma företag och medlemmar som i Annonsverktyget). */
export default async function ReportListPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const companies = await companiesOf(user.user_id);

  const { data } = companies.length
    ? await getSupabaseAdminClient()
        .from("report_docs")
        .select("id, company_id, title, client, updated_at, tags, plan_id")
        .in("company_id", companies.map((c) => c.id))
        .order("updated_at", { ascending: false })
    : { data: [] };
  const reports = (data ?? []) as { id: string; company_id: string; title: string; client: string; updated_at: string; tags: string[] | null; plan_id: string | null }[];
  const date = (iso: string) => new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Mediaplan" description="Planer för budget, kanaler och tidsplan, och rapporter till kund när kampanjen är körd." />
      <MediaplanTabs />
      <main className="max-w-6xl w-full mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold">Rapport</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-[70ch]">
          Bygg en kampanjrapport till kund av sektioner, ungefär som bilder i PowerPoint, och ladda ner den som PDF.
        </p>

        {companies.length === 0 ? (
          <p className="bg-white px-5 py-6 text-gray-700 max-w-[70ch] mt-6">
            Du är inte medlem i något företag än. Be en admin lägga till dig under Social media → Annonsverktyg.
          </p>
        ) : (
          <>
            <div className="mt-6">
              <NewReportForm companies={companies} />
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
                        href={`/mediaplan/rapport/${r.id}`}
                        className="flex items-center gap-3 bg-white px-5 py-4 hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
                      >
                        <FileBarChart className="w-5 h-5 text-milou-500 shrink-0" aria-hidden />
                        <span className="flex-1 min-w-0">
                          <span className="font-bold block truncate">{r.title || r.client}</span>
                          <span className="text-xs text-gray-600 block truncate">
                            {r.client} · {companies.find((c) => c.id === r.company_id)?.name} · ändrad {date(r.updated_at)}
                          </span>
                          <TagChips tags={r.tags ?? []} />
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
