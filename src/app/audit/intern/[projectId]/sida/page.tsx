import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { toActions, type Action, type Priority } from "@/lib/audit/actions";
import { aiEnabled, type PageAi } from "@/lib/audit/ai";
import { score } from "@/lib/audit/checks";
import type { AuditedPage, Check } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import PageAudit from "../../PageAudit";

const PRIORITIES: { key: Priority; label: string; accent: string }[] = [
  { key: "critical", label: "Kritiskt", accent: "border-milou-500" },
  { key: "high", label: "Hög", accent: "border-milou-300" },
  { key: "medium", label: "Medel", accent: "border-peach" },
  { key: "nice", label: "Nice to have", accent: "border-gray-300" },
];

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

interface PageRun {
  id: string;
  title: string;
  seo_score: number;
  geo_score: number;
  actions: Action[];
  ai: PageAi | null;
  created_by: string | null;
  created_at: string;
}

const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
};

/**
 * En enskild sida i ett projekt. Visar senaste sidgranskningen; finns ingen
 * används sidans resultat från projektets senaste fulla audit.
 */
export default async function AuditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ url?: string }>;
}) {
  await connection();
  const [{ projectId }, { url }] = await Promise.all([params, searchParams]);
  if (!url) notFound();
  const sb = getSupabaseAdminClient();

  const { data: project } = await sb.from("audit_projects").select("id, name, domain").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const { data: runsData } = await sb
    .from("audit_page_runs")
    .select("id, title, seo_score, geo_score, actions, ai, created_by, created_at")
    .eq("project_id", project.id)
    .eq("url", url)
    .order("created_at", { ascending: false })
    .limit(30);
  const runs = (runsData ?? []) as PageRun[];
  let current: PageRun | null = runs[0] ?? null;
  let source = current ? `Sidgranskning ${fmt.format(new Date(current.created_at))}${current.created_by ? ` av ${current.created_by}` : ""}` : "";

  // Ingen egen granskning: ta sidans resultat ur den senaste fulla auditen.
  if (!current) {
    const { data: siteRun } = await sb
      .from("audit_internal_runs")
      .select("id, pages, created_by, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const page = ((siteRun?.pages ?? []) as AuditedPage[]).find((p) => p.url === url);
    if (siteRun && page?.checks) {
      const s = score(page.checks as Check[]);
      current = { id: siteRun.id, title: page.title, seo_score: s.seoScore, geo_score: s.geoScore, actions: toActions(page.checks), ai: null, created_by: siteRun.created_by, created_at: siteRun.created_at };
      source = `Fulla auditen ${fmt.format(new Date(siteRun.created_at))}`;
    }
  }

  const prev = current && runs.length > 1 && current.id === runs[0].id ? runs[1] : null;
  const actions = current?.actions ?? [];

  return (
    <main className="flex-1">
      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <Link href={`/audit/intern/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-peach transition-colors">
            <ArrowLeft className="w-4 h-4" /> {project.name}
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-3xl sm:text-[40px] sm:leading-[45px] break-words">{current?.title || pathOf(url)}</h1>
              <p className="mt-2 text-gray-400">
                <a href={url} target="_blank" rel="noreferrer" className="text-white underline decoration-peach decoration-2 underline-offset-4 hover:decoration-milou-500 break-all">
                  {url.replace(/^https?:\/\//, "")}
                </a>
                {source && <span className="ml-3">{source}</span>}
              </p>
            </div>
            <PageAudit projectId={project.id} url={url} />
          </div>
          <div className="mt-8 flex gap-12">
            {(["seo", "geo"] as const).map((g) => {
              const v = current ? current[`${g}_score`] : null;
              const p = prev ? prev[`${g}_score`] : null;
              return (
                <div key={g}>
                  <p className="text-sm text-gray-400 uppercase font-bold">{g}</p>
                  <p className="font-display font-extrabold text-[56px] leading-none tabular-nums">
                    {v ?? "–"}<span className="text-2xl text-gray-500">/10</span>
                    {v !== null && p !== null && v !== p && (
                      <span className={`ml-3 align-middle text-sm px-2 py-0.5 ${v > p ? "bg-[#C2EDE5] text-[#052D28]" : "bg-milou-500 text-white"}`}>{v > p ? `+${v - p}` : v - p}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-4">
        {current && <AiPanel ai={current.ai} enabled={aiEnabled()} />}
        {!current ? (
          <p className="bg-white px-5 py-6 text-gray-600">Sidan är inte granskad ännu. Tryck på Granska om sidan.</p>
        ) : actions.length === 0 ? (
          <p className="bg-white px-5 py-6 text-gray-600">Inget att åtgärda på den här sidan.</p>
        ) : (
          PRIORITIES.map((p) => {
            const items = actions.filter((a) => a.priority === p.key);
            if (items.length === 0) return null;
            return (
              <div key={p.key} className={`bg-white border-l-4 ${p.accent}`}>
                <h3 className="font-bold text-lg px-5 pt-4 pb-3 border-b border-gray-100">{p.label} <span className="text-gray-400 text-sm tabular-nums">{items.length}</span></h3>
                <ul>
                  {items.map((a) => (
                    <li key={a.id} className="px-5 py-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 ${a.group === "geo" ? "bg-peach text-gray-900" : "bg-plum text-white"}`}>{a.group === "geo" ? "GEO" : "SEO"}</span>
                        <span className="font-bold">{a.title}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5">{a.detail}</p>
                      {a.fix && <p className="mt-1 max-w-[80ch]">{a.fix}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
        <p className="text-xs text-gray-500">Enskilda sidor granskas med sidkontrollerna. Sajtövergripande saker som robots.txt och sitemap finns bara i projektets fulla audit.</p>
      </div>
    </main>
  );
}

function AiPanel({ ai, enabled }: { ai: PageAi | null; enabled: boolean }) {
  if (!ai) {
    return (
      <p className="bg-white border-l-4 border-plum px-5 py-4 text-sm text-gray-600">
        {enabled ? "Inga AI-förslag för den här granskningen. Tryck på Granska om sidan för att få nya." : "AI-förslag är avstängda. Lägg till ANTHROPIC_API_KEY i miljövariablerna för att slå på dem."}
      </p>
    );
  }
  return (
    <section className="bg-white border-l-4 border-plum px-5 py-5 space-y-5">
      <div>
        <h2 className="font-bold text-lg">AI-förslag</h2>
        {ai.intent && <p className="text-gray-600 mt-1 max-w-[80ch]">{ai.intent}</p>}
      </div>
      {ai.titles.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-1.5">Titelförslag</h3>
          <ul className="space-y-1">
            {ai.titles.map((t) => (
              <li key={t}>{t} <span className="text-xs text-gray-400 tabular-nums">{t.length} tecken</span></li>
            ))}
          </ul>
        </div>
      )}
      {ai.description && (
        <div>
          <h3 className="text-sm font-bold mb-1.5">Metabeskrivning</h3>
          <p className="max-w-[80ch]">{ai.description} <span className="text-xs text-gray-400 tabular-nums">{ai.description.length} tecken</span></p>
        </div>
      )}
      {ai.contentTips.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-1.5">Innehåll</h3>
          <ul className="list-disc pl-5 space-y-1 max-w-[80ch]">{ai.contentTips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {ai.geoTips.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-1.5">Synas i AI-svar (GEO)</h3>
          <ul className="list-disc pl-5 space-y-1 max-w-[80ch]">{ai.geoTips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <p className="text-xs text-gray-500">Skrivet av AI från sidans innehåll. Läs igenom innan det används. Betygen påverkas inte.</p>
    </section>
  );
}
