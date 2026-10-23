import Link from "next/link";
import { connection } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import NewProjectForm from "./NewProjectForm";

interface Project {
  id: string;
  name: string;
  domain: string;
}

interface LatestRun {
  project_id: string;
  seo_score: number;
  geo_score: number;
  created_at: string;
}

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Projektlistan i den interna auditen. Ett projekt per domän, med datum och
 * betyg från den senaste körningen.
 */
export default async function AuditProjectsPage() {
  await connection();
  const sb = getSupabaseAdminClient();

  const [{ data: projectData, error }, { data: runData }] = await Promise.all([
    sb.from("audit_projects").select("id, name, domain").order("name"),
    sb
      .from("audit_internal_runs")
      .select("project_id, seo_score, geo_score, created_at")
      .not("project_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const projects = (projectData ?? []) as Project[];

  // Raderna kommer nyast först, så första träffen per projekt är den senaste.
  const latest = new Map<string, LatestRun>();
  for (const r of (runData ?? []) as LatestRun[]) if (!latest.has(r.project_id)) latest.set(r.project_id, r);

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold">SEO/GEO-audit — internt</h1>
      <p className="text-sm text-gray-500 mt-1">Projekt med betyg och datum för senaste granskningen.</p>

      {error && <p className="mt-6 text-milou-600">Kunde inte läsa projekten. Är migration 0010 körd?</p>}

      <section className="mt-8">
        <NewProjectForm />
      </section>

      <section className="mt-8">
        <h2 className="font-bold mb-2">Projekt ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">Inga projekt ännu. Lägg till ett ovan.</p>
        ) : (
          <table className="w-full text-sm bg-white">
            <thead className="text-left text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 px-3 font-normal">Projekt</th>
                <th className="py-2 px-3 font-normal">Domän</th>
                <th className="py-2 px-3 font-normal">Senaste audit</th>
                <th className="py-2 px-3 font-normal text-right">SEO</th>
                <th className="py-2 px-3 font-normal text-right">GEO</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const run = latest.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-bold">
                      <Link href={`/audit/intern/${p.id}`} className="hover:text-milou-500">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-gray-500">{p.domain}</td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                      {run ? fmt.format(new Date(run.created_at)) : <span className="text-gray-400">Aldrig</span>}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{run?.seo_score ?? "–"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{run?.geo_score ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
