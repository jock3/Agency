import Link from "next/link";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import type { Check } from "@/lib/audit/types";
import RunRow from "./RunRow";
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
  checks: Check[] | null;
  audit_leads: { email: string }[] | null;
}

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Intern vy, bakom inloggning via proxy. Läser direkt med service-role eftersom
 * sidan renderas på servern och tabellerna nekar anon.
 */
export default async function AuditExternPage() {
  await connection();
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("audit_runs")
    .select("id, final_url, host, score, seo_score, geo_score, created_at, pages, checks, audit_leads(email)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Externt verktyg</h2>
          <p className="text-sm text-gray-500 mt-1">Granskningar från det publika verktyget, med besökarens e-post. Senaste 200 körningarna.</p>
        </div>
        <Link href="/share/audit" target="_blank" className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 text-white px-4 py-2">
          Öppna verktyget <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {error && <p className="mt-6 text-milou-600">Kunde inte läsa granskningarna. Är migration 0006 körd?</p>}

      <section className="mt-8">
        <h2 className="font-bold mb-2">Alla granskningar ({rows.length})</h2>
        <table className="w-full text-sm bg-white">
          <thead className="text-left text-gray-500 border-b border-gray-200">
            <tr>
              <th className="py-2 px-3 font-normal">Tid</th>
              <th className="py-2 px-3 font-normal">URL</th>
              <th className="py-2 px-3 font-normal">E-post</th>
              <th className="py-2 px-3 font-normal text-right">Totalt</th>
              <th className="py-2 px-3 font-normal text-right">SEO</th>
              <th className="py-2 px-3 font-normal text-right">GEO</th>
              <th className="py-2 px-3 font-normal text-right">Sidor</th>
              <th className="py-2 px-3 font-normal text-right"><span className="sr-only">Brister</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <RunRow
                key={r.id}
                run={{
                  id: r.id,
                  final_url: r.final_url,
                  score: r.score,
                  seo_score: r.seo_score,
                  geo_score: r.geo_score,
                  time: fmt.format(new Date(r.created_at)),
                  pageCount: r.pages?.length ?? 1,
                  emails: [...new Set((r.audit_leads ?? []).map((l) => l.email))],
                  checks: r.checks ?? [],
                }}
              />
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
