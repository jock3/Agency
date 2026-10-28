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

  const lastRun = run
    ? `${run.pages.length} sidor granskade ${fmt.format(new Date(run.created_at))}${run.created_by ? ` av ${run.created_by}` : ""}`
    : "Ingen audit körd ännu";

  return (
    <main className="flex-1">
      {/* Projektets rubrikyta, mörk som sidhuvudena i resten av appen. */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <Link href="/audit/intern" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-peach transition-colors">
            <ArrowLeft className="w-4 h-4" /> Alla projekt
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-3xl sm:text-[40px] sm:leading-[45px]">{project.name}</h1>
              <p className="mt-2 text-gray-400">
                <a href={run?.final_url ?? `https://${project.domain}`} target="_blank" rel="noreferrer" className="text-white underline decoration-peach decoration-2 underline-offset-4 hover:decoration-milou-500">
                  {run ? run.final_url.replace(/^https?:\/\//, "").replace(/\/$/, "") : project.domain}
                </a>
                <span className="ml-3">{lastRun}</span>
              </p>
              <ProjectActions key={`${project.name}|${project.domain}`} projectId={project.id} name={project.name} domain={project.domain} />
            </div>
            <AuditButton projectId={project.id} />
          </div>

          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            <ScoreMeter label="SEO" description="Hur väl sajten syns i Google." score={run?.seo_score ?? null} previous={previous?.seo_score} tone="bg-peach" />
            <ScoreMeter label="GEO" description="Hur väl sajten syns i AI-tjänster som ChatGPT." score={run?.geo_score ?? null} previous={previous?.geo_score} tone="bg-blush" />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {error && <p className="mb-6 text-milou-600">Kunde inte läsa historiken. Är migration 0010 körd?</p>}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <h2 className="font-display font-extrabold text-2xl">Åtgärder</h2>
            {/* Sammanfattning per prioritet, så hela läget syns innan listan. */}
            <ul className="flex flex-wrap gap-2 text-sm">
              {PRIORITIES.map((p) => {
                const n = actions.filter((a) => a.priority === p.key).length;
                return (
                  <li key={p.key} className={`flex items-center gap-2 h-8 pl-2 pr-3 bg-white border-l-4 ${p.accent} ${n === 0 ? "text-gray-400" : "text-gray-900"}`}>
                    <b className="tabular-nums">{n}</b> {p.label.toLowerCase()}
                  </li>
                );
              })}
            </ul>
          </div>

          {!run ? (
            <p className="bg-white px-5 py-6 text-gray-600">Kör en audit för att få betyg och åtgärder för {project.domain}.</p>
          ) : (
            <div className="space-y-4">
              {PRIORITIES.map((p) => {
                const items = actions.filter((a) => a.priority === p.key);
                // Tomma grupper blir en rad, så listan visar det som behöver göras.
                if (items.length === 0) {
                  return (
                    <p key={p.key} className={`bg-white border-l-4 ${p.accent} px-5 py-3 text-sm text-gray-600`}>
                      <b className="text-gray-900">{p.label}:</b> inget att åtgärda.
                    </p>
                  );
                }
                return (
                  <div key={p.key} className={`bg-white border-l-4 ${p.accent}`}>
                    <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-lg">{p.label}</h3>
                        <p className="text-sm text-gray-500">{p.hint}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-gray-500">{items.length}</span>
                    </div>
                    <ul>
                      {items.map((a) => (
                        <li key={a.id} className="px-5 py-4 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 ${a.group === "geo" ? "bg-peach text-gray-900" : "bg-plum text-white"}`}>
                              {a.group === "geo" ? "GEO" : "SEO"}
                            </span>
                            <span className="font-bold">{a.title}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1.5">{a.detail}</p>
                          {a.fix && <p className="mt-1 max-w-[80ch]">{a.fix}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display font-extrabold text-2xl mb-4">Historik</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Inga körningar ännu.</p>
          ) : (
            <table className="w-full text-sm bg-white">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-normal">Tid</th>
                  <th className="py-3 px-4 font-normal">URL</th>
                  <th className="py-3 px-4 font-normal text-right">SEO</th>
                  <th className="py-3 px-4 font-normal text-right">GEO</th>
                  <th className="py-3 px-4 font-normal">Av</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={`border-b border-gray-100 last:border-b-0 ${h.id === run?.id ? "bg-peach/30" : "hover:bg-gray-50"}`}>
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <Link href={`/audit/intern/${project.id}?run=${h.id}`} className="font-bold hover:text-milou-500">
                        {fmt.format(new Date(h.created_at))}
                      </Link>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-gray-600">{h.final_url}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{h.seo_score}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{h.geo_score}</td>
                    <td className="py-3 px-4 text-gray-500">{h.created_by ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

/** Betyget som en mätare i tio raka segment, ett per poäng. */
function ScoreMeter({
  label,
  description,
  score,
  previous,
  tone,
}: {
  label: string;
  description: string;
  score: number | null;
  previous?: number;
  tone: string;
}) {
  const delta = score !== null && previous !== undefined ? score - previous : null;
  return (
    <div>
      <div className="flex items-end gap-4">
        <h2 className="font-display font-extrabold text-xl pb-2 w-14">{label}</h2>
        <p className="font-display font-extrabold text-[64px] leading-none tabular-nums">
          {score ?? "–"}
          <span className="text-2xl text-gray-500">/10</span>
        </p>
        {delta !== null && (
          <span
            className={`mb-2 text-sm font-bold tabular-nums px-2 py-0.5 ${
              delta > 0 ? "bg-[#C2EDE5] text-[#052D28]" : delta < 0 ? "bg-milou-500 text-white" : "bg-gray-800 text-gray-300"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta} sedan förra
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1" role="img" aria-label={`${label}: ${score ?? "inget"} av 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-3 ${score !== null && i < score ? tone : "bg-gray-800"}`} />
        ))}
      </div>
      <p className="text-sm text-gray-400 mt-3">{score === null ? "Ingen granskning ännu." : description}</p>
    </div>
  );
}
