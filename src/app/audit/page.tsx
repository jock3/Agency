import Link from "next/link";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface Row {
  id: string;
  final_url: string;
  host: string;
  score: number;
  seo_score: number;
  geo_score: number;
  created_at: string;
  pages: unknown[] | null;
  audit_leads: { email: string; created_at: string }[];
}

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Intern vy, bakom inloggning via proxy. Läser direkt med service-role eftersom
 * sidan renderas på servern och tabellerna nekar anon.
 */
export default async function AuditAdminPage() {
  await connection();
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("audit_runs")
    .select("id, final_url, host, score, seo_score, geo_score, created_at, pages, audit_leads(email, created_at)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];
  const leads = rows.flatMap((r) => r.audit_leads.map((l) => ({ ...l, run: r })));
  leads.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SEO/GEO-audit</h1>
          <p className="text-sm text-gray-500 mt-1">Granskningar och leads från det publika verktyget. Senaste 200 körningarna.</p>
        </div>
        <Link href="/share/audit" target="_blank" className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 text-white px-4 py-2">
          Öppna verktyget <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {error && <p className="mt-6 text-milou-600">Kunde inte läsa granskningarna. Är migration 0006 körd?</p>}

      <section className="mt-8">
        <h2 className="font-bold mb-2">Leads ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-500">Inga leads än.</p>
        ) : (
          <table className="w-full text-sm bg-white">
            <thead className="text-left text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 px-3 font-normal">Tid</th>
                <th className="py-2 px-3 font-normal">E-post</th>
                <th className="py-2 px-3 font-normal">Sajt</th>
                <th className="py-2 px-3 font-normal text-right">Betyg</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-3 whitespace-nowrap tabular-nums">{fmt.format(new Date(l.created_at))}</td>
                  <td className="py-2 px-3">
                    <a href={`mailto:${l.email}`} className="hover:text-milou-500">
                      {l.email}
                    </a>
                  </td>
                  <td className="py-2 px-3">{l.run.host}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold">{l.run.score}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-bold mb-2">Alla granskningar ({rows.length})</h2>
        <table className="w-full text-sm bg-white">
          <thead className="text-left text-gray-500 border-b border-gray-200">
            <tr>
              <th className="py-2 px-3 font-normal">Tid</th>
              <th className="py-2 px-3 font-normal">URL</th>
              <th className="py-2 px-3 font-normal text-right">Totalt</th>
              <th className="py-2 px-3 font-normal text-right">SEO</th>
              <th className="py-2 px-3 font-normal text-right">GEO</th>
              <th className="py-2 px-3 font-normal text-right">Sidor</th>
              <th className="py-2 px-3 font-normal text-right">Leads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2 px-3 whitespace-nowrap tabular-nums">{fmt.format(new Date(r.created_at))}</td>
                <td className="py-2 px-3 max-w-xs truncate">
                  <a href={r.final_url} target="_blank" rel="noreferrer" className="hover:text-milou-500">
                    {r.final_url}
                  </a>
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-bold">{r.score}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.seo_score}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.geo_score}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.pages?.length ?? 1}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.audit_leads.length || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
