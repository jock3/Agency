import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import type { Action, Priority } from "@/lib/audit/actions";
import { domainOf } from "@/lib/audit/projects";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import AuditButton from "../AuditButton";
import ProjectActions from "../ProjectActions";

interface HistoryRow {
  id: string;
  final_url: string;
  host: string;
  seo_score: number;
  geo_score: number;
  created_by: string | null;
  created_at: string;
}

interface RunRow extends HistoryRow {
  actions: Action[];
  pages: unknown[];
}

const PRIORITIES: { key: Priority; label: string; hint: string; accent: string }[] = [
  { key: "critical", label: "Kritiskt", hint: "Hindrar synlighet, åtgärda först", accent: "border-milou-500" },
  { key: "high", label: "Hög", hint: "Stor effekt, bör göras snart", accent: "border-milou-300" },
  { key: "medium", label: "Medel", hint: "Förbättrar betyget märkbart", accent: "border-peach" },
  { key: "nice", label: "Nice to have", hint: "Finputs när resten är klart", accent: "border-gray-300" },
];

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Ett projekts dashboard. Visar vald körning (?run=id) eller den senaste, med
 * betyg, prioriterade åtgärder och projektets historik. Läser med service-role
 * eftersom sidan renderas på servern bakom inloggning och tabellerna nekar anon.
 */
export default async function AuditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  await connection();
  const [{ projectId }, { run: runId }] = await Promise.all([params, searchParams]);
  const sb = getSupabaseAdminClient();

  const { data: project } = await sb.from("audit_projects").select("id, name, domain").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const { data: historyData, error } = await sb
    .from("audit_internal_runs")
    .select("id, final_url, host, seo_score, geo_score, created_by, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const history = (historyData ?? []) as HistoryRow[];

  const selectedId = runId ?? history[0]?.id;
  const { data: runData } = selectedId
    ? await sb
        .from("audit_internal_runs")
        .select("id, final_url, host, seo_score, geo_score, created_by, created_at, actions, pages")
        .eq("id", selectedId)
        .eq("project_id", project.id)
        .maybeSingle()
    : { data: null };
  const run = runData as RunRow | null;

  // Föregående körning av samma domän, för att visa hur betyget har ändrats.
  // Körningar från före ett domänbyte jämförs inte.
  const previous = run
    ? history.find((h) => h.created_at < run.created_at && domainOf(h.host) === domainOf(run.host))
    : undefined;
  const actions = run?.actions ?? [];

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/audit/intern" className="flex items-center gap-1 text-xs text-gray-500 hover:text-milou-500">
            <ArrowLeft className="w-3 h-3" /> Alla projekt
          </Link>
          <h2 className="text-2xl font-bold mt-1">{project.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {run
              ? `${run.final_url} · ${run.pages.length} sidor · senaste audit ${fmt.format(new Date(run.created_at))}${run.created_by ? ` av ${run.created_by}` : ""}`
              : `${project.domain} · ingen audit körd ännu`}
          </p>
          <ProjectActions key={`${project.name}|${project.domain}`} projectId={project.id} name={project.name} domain={project.domain} />
        </div>
        <AuditButton projectId={project.id} />
      </div>

      {error && <p className="mt-6 text-milou-600">Kunde inte läsa historiken. Är migration 0010 körd?</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <ScoreCard label="SEO" description="Hur väl sajten syns i Google." score={run?.seo_score ?? null} previous={previous?.seo_score} />
        <ScoreCard label="GEO" description="Hur väl sajten syns i AI-tjänster som ChatGPT." score={run?.geo_score ?? null} previous={previous?.geo_score} />
      </section>

      <section className="mt-10">
        <h2 className="font-bold mb-4">Åtgärder ({actions.length})</h2>
        <div className="space-y-6">
          {PRIORITIES.map((p) => {
            const items = actions.filter((a) => a.priority === p.key);
            return (
              <div key={p.key} className={`bg-white border-l-4 ${p.accent}`}>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold">{p.label}</h3>
                    <p className="text-xs text-gray-500">{p.hint}</p>
                  </div>
                  <span className="text-sm tabular-nums text-gray-500">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-gray-400">{run ? "Inget att åtgärda här." : "Inga åtgärder ännu."}</p>
                ) : (
                  <ul>
                    {items.map((a) => (
                      <li key={a.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5">{a.group}</span>
                          <span className="font-bold text-sm">{a.title}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{a.detail}</p>
                        {a.fix && <p className="text-sm mt-1">{a.fix}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-bold mb-2">Historik ({history.length})</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Inga körningar ännu.</p>
        ) : (
          <table className="w-full text-sm bg-white">
            <thead className="text-left text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 px-3 font-normal">Tid</th>
                <th className="py-2 px-3 font-normal">URL</th>
                <th className="py-2 px-3 font-normal text-right">SEO</th>
                <th className="py-2 px-3 font-normal text-right">GEO</th>
                <th className="py-2 px-3 font-normal">Av</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className={`border-b border-gray-100 ${h.id === run?.id ? "bg-peach/30" : "hover:bg-gray-50"}`}>
                  <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                    <Link href={`/audit/intern/${project.id}?run=${h.id}`} className="hover:text-milou-500">
                      {fmt.format(new Date(h.created_at))}
                    </Link>
                  </td>
                  <td className="py-2 px-3 max-w-xs truncate">
                    <Link href={`/audit/intern/${project.id}?run=${h.id}`} className="hover:text-milou-500">
                      {h.final_url}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{h.seo_score}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{h.geo_score}</td>
                  <td className="py-2 px-3 text-gray-500">{h.created_by ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function ScoreCard({
  label,
  description,
  score,
  previous,
}: {
  label: string;
  description: string;
  score: number | null;
  previous?: number;
}) {
  const delta = score !== null && previous !== undefined ? score - previous : null;
  return (
    <div className="bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{label}</h2>
        <span className="text-xs text-gray-500">av 10</span>
      </div>
      <div className="flex items-baseline gap-3 mt-4">
        <p className="text-5xl font-bold tabular-nums">{score ?? "–"}</p>
        {delta !== null && (
          <span className={`text-sm font-bold tabular-nums ${delta > 0 ? "text-green-600" : delta < 0 ? "text-milou-500" : "text-gray-400"}`}>
            {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta} sedan förra
          </span>
        )}
      </div>
      <div className="h-1.5 bg-gray-100 mt-4">
        <div className="h-full bg-milou-500" style={{ width: `${((score ?? 0) / 10) * 100}%` }} />
      </div>
      <p className="text-sm text-gray-500 mt-3">{score === null ? "Ingen granskning ännu." : description}</p>
    </div>
  );
}
