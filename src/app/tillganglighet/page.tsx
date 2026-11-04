import Link from "next/link";
import { connection } from "next/server";
import PageHeader from "@/components/PageHeader";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import NewProjectForm from "@/app/audit/intern/NewProjectForm";

interface Project {
  id: string;
  name: string;
  domain: string;
}

interface LatestRun {
  project_id: string;
  score: number;
  created_at: string;
}

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

/** Projektlistan i tillgänglighetsverktyget, med betyg och datum för senaste granskningen. */
export default async function A11yProjectsPage() {
  await connection();
  const sb = getSupabaseAdminClient();

  const [{ data: projectData, error }, { data: runData }] = await Promise.all([
    sb.from("a11y_projects").select("id, name, domain").order("name"),
    sb.from("a11y_runs").select("project_id, score, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const projects = (projectData ?? []) as Project[];

  const latest = new Map<string, LatestRun>();
  for (const r of (runData ?? []) as LatestRun[]) if (!latest.has(r.project_id)) latest.set(r.project_id, r);

  return (
    <>
      <PageHeader
        title="Tillgänglighet"
        description="Automatisk kontroll mot WCAG 2.2 nivå AA i en riktig webbläsare, med betyg och åtgärder i prioritetsordning."
      />
      <main className="max-w-6xl w-full mx-auto px-6 py-8">
        {error && <p className="mb-6 text-milou-600">Kunde inte läsa projekten. Är migration 0014 körd?</p>}

        <section>
          <NewProjectForm apiBase="/api/tillganglighet" pageBase="/tillganglighet" />
        </section>

        <section className="mt-8">
          <h2 className="font-bold mb-2">Projekt ({projects.length})</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500">Inga projekt ännu. Lägg till ett ovan.</p>
          ) : (
            <table className="w-full text-sm bg-white">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-2 px-3 font-normal">Projekt</th>
                  <th className="py-2 px-3 font-normal">Domän</th>
                  <th className="py-2 px-3 font-normal">Senaste granskning</th>
                  <th className="py-2 px-3 font-normal text-right">Betyg</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const run = latest.get(p.id);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-bold">
                        <Link href={`/tillganglighet/${p.id}`} className="hover:text-milou-500">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-gray-500">{p.domain}</td>
                      <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                        {run ? fmt.format(new Date(run.created_at)) : <span className="text-gray-500">Aldrig</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{run?.score ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
