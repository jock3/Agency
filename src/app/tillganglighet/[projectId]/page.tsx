import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ScoreMeter from "@/components/audit/ScoreMeter";
import AuditButton from "@/app/audit/intern/AuditButton";
import ProjectActions from "@/app/audit/intern/ProjectActions";
import { domainOf } from "@/lib/audit/projects";
import type { Finding, ManualCheck, PageSummary, Priority } from "@/lib/a11y/score";
import { criterionLabel, criterionUrl } from "@/lib/a11y/wcag";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface HistoryRow {
  id: string;
  final_url: string;
  host: string;
  score: number;
  created_by: string | null;
  created_at: string;
}

interface RunRow extends HistoryRow {
  findings: Finding[];
  manual: ManualCheck[];
  pages: PageSummary[];
  passes: number;
}

const PRIORITIES: { key: Priority; label: string; hint: string; accent: string }[] = [
  { key: "critical", label: "Kritiskt", hint: "Stänger ute användare helt, åtgärda först", accent: "border-milou-500" },
  { key: "high", label: "Hög", hint: "Allvarliga hinder för många användare", accent: "border-milou-300" },
  { key: "medium", label: "Medel", hint: "Försvårar men stänger sällan ute", accent: "border-peach" },
  { key: "nice", label: "Nice to have", hint: "Mindre irritationsmoment", accent: "border-gray-300" },
];

/** Det automatiska testet kan inte avgöra de här, så de listas som en checklista. */
const MANUAL_TESTS = [
  "Gå igenom sidan med bara tangentbordet (Tab, Skift+Tab, Enter, Esc). Allt ska gå att nå och fokus ska synas.",
  "Lyssna med en skärmläsare (VoiceOver på Mac: Cmd+F5). Rubriker, länkar och knappar ska låta begripliga.",
  "Zooma till 200 % och smalna av fönstret till mobilbredd. Inget innehåll får försvinna eller kräva sidledsscroll.",
  "Skicka ett formulär med fel. Felet ska beskrivas i text och gå att hitta utan färg.",
  "Kontrollera att video har undertexter och att inget rör sig eller låter i mer än 5 sekunder utan pausknapp.",
  "Läs alt-texterna. Verktyget ser att de finns, inte att de beskriver bilden rätt.",
];

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

const pathOf = (u: string) => {
  try {
    const x = new URL(u);
    return x.pathname + x.search;
  } catch {
    return u;
  }
};

/**
 * Ett tillgänglighetsprojekts dashboard: betyg, brister per prioritet med
 * WCAG-kriterier och exempel, saker som behöver manuell kontroll, sidor och
 * historik. Läser med service-role bakom inloggning.
 */
export default async function A11yProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  await connection();
  const [{ projectId }, { run: runId }] = await Promise.all([params, searchParams]);
  const sb = getSupabaseAdminClient();

  const { data: project } = await sb.from("a11y_projects").select("id, name, domain").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const { data: historyData, error } = await sb
    .from("a11y_runs")
    .select("id, final_url, host, score, created_by, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const history = (historyData ?? []) as HistoryRow[];

  const selectedId = runId ?? history[0]?.id;
  const { data: runData } = selectedId
    ? await sb
        .from("a11y_runs")
        .select("id, final_url, host, score, created_by, created_at, findings, manual, pages, passes")
        .eq("id", selectedId)
        .eq("project_id", project.id)
        .maybeSingle()
    : { data: null };
  const run = runData as RunRow | null;

  const previous = run
    ? history.find((h) => h.created_at < run.created_at && domainOf(h.host) === domainOf(run.host))
    : undefined;
  const findings = run?.findings ?? [];
  const elements = findings.reduce((n, f) => n + f.count, 0);

  const lastRun = run
    ? `${run.pages.length} sidor granskade ${fmt.format(new Date(run.created_at))}${run.created_by ? ` av ${run.created_by}` : ""}`
    : "Ingen granskning körd ännu";

  return (
    <main className="flex-1">
      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <Link href="/tillganglighet" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-peach transition-colors">
            <ArrowLeft className="w-4 h-4" /> Alla projekt
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-3xl sm:text-[40px] sm:leading-[45px]">{project.name}</h1>
              <p className="mt-2 text-gray-400">
                <a
                  href={run?.final_url ?? `https://${project.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline decoration-peach decoration-2 underline-offset-4 hover:decoration-milou-500"
                >
                  {run ? run.final_url.replace(/^https?:\/\//, "").replace(/\/$/, "") : project.domain}
                </a>
                <span className="ml-3">{lastRun}</span>
              </p>
              <ProjectActions
                key={`${project.name}|${project.domain}`}
                projectId={project.id}
                name={project.name}
                domain={project.domain}
                apiBase="/api/tillganglighet"
                pageBase="/tillganglighet"
              />
            </div>
            <AuditButton
              projectId={project.id}
              apiBase="/api/tillganglighet"
              pageBase="/tillganglighet"
              label="Ny granskning"
              hint="Sidorna öppnas i en riktig webbläsare. Tar upp till ett par minuter."
            />
          </div>

          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            <ScoreMeter
              label="WCAG"
              description="Automatisk kontroll mot WCAG 2.2 nivå A och AA."
              score={run?.score ?? null}
              previous={previous?.score}
              tone="bg-peach"
            />
            {run && (
              <dl className="grid grid-cols-3 gap-4 self-end">
                <Stat label="Regler som bryts" value={findings.length} />
                <Stat label="Element med brister" value={elements} />
                <Stat label="Behöver manuell kontroll" value={run.manual.length} />
              </dl>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {error && <p className="mb-6 text-milou-600">Kunde inte läsa historiken. Är migration 0014 körd?</p>}

        <aside className="mb-8 bg-white border-l-4 border-plum px-5 py-4 max-w-[90ch]">
          <h2 className="font-bold mb-1">Vad betyget betyder</h2>
          <p className="text-sm text-gray-700">
            Granskningen kör axe-core, samma motor som Google Lighthouse, på upp till 8 sidor. Automatiska tester hittar ungefär
            en tredjedel av alla WCAG-brister. Ett högt betyg betyder att de automatiskt mätbara kraven är uppfyllda, inte att
            sajten är godkänd enligt WCAG eller tillgänglighetslagen. Det kräver också manuell testning, se checklistan längre ned.
          </p>
        </aside>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <h2 className="font-display font-extrabold text-2xl">Åtgärder</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {PRIORITIES.map((p) => {
                const n = findings.filter((f) => f.priority === p.key).length;
                return (
                  <li key={p.key} className={`flex items-center gap-2 h-8 pl-2 pr-3 bg-white border-l-4 ${p.accent} ${n === 0 ? "text-gray-500" : "text-gray-900"}`}>
                    <b className="tabular-nums">{n}</b> {p.label.toLowerCase()}
                  </li>
                );
              })}
            </ul>
          </div>

          {!run ? (
            <p className="bg-white px-5 py-6 text-gray-600">Kör en granskning för att få betyg och åtgärder för {project.domain}.</p>
          ) : (
            <div className="space-y-4">
              {PRIORITIES.map((p) => {
                const items = findings.filter((f) => f.priority === p.key);
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
                      {items.map((f) => (
                        <FindingItem key={f.id} finding={f} pageCount={run.pages.length} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display font-extrabold text-2xl mb-4">Behöver manuell kontroll</h2>
            {!run || run.manual.length === 0 ? (
              <p className="text-sm text-gray-500">{run ? "Inget som verktyget lämnade osäkert." : "Ingen granskning ännu."}</p>
            ) : (
              <ul className="bg-white divide-y divide-gray-100 text-sm">
                {run.manual.map((m) => (
                  <li key={m.id} className="px-4 py-3 flex justify-between gap-4">
                    <span>{m.title}</span>
                    <span className="text-gray-500 whitespace-nowrap tabular-nums">
                      {m.pages} {m.pages === 1 ? "sida" : "sidor"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-500">Här kunde verktyget inte avgöra själv, ofta kontrast mot bakgrundsbilder eller dolt innehåll.</p>
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl mb-4">Testa själv</h2>
            <ol className="bg-white divide-y divide-gray-100 text-sm list-decimal list-inside">
              {MANUAL_TESTS.map((t) => (
                <li key={t} className="px-4 py-3">
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display font-extrabold text-2xl mb-4">Sidor</h2>
          {!run || run.pages.length === 0 ? (
            <p className="text-sm text-gray-500">Inga sidor granskade ännu.</p>
          ) : (
            <table className="w-full text-sm bg-white">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-normal">Sida</th>
                  <th className="py-3 px-4 font-normal text-right">Regler som bryts</th>
                  <th className="py-3 px-4 font-normal text-right">Element</th>
                  <th className="py-3 px-4 font-normal text-right">Betyg</th>
                </tr>
              </thead>
              <tbody>
                {run.pages.map((p) => (
                  <tr key={p.url} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-3 px-4 max-w-md">
                      <a href={p.url} target="_blank" rel="noreferrer" className="font-bold hover:text-milou-500 block truncate">
                        {p.title || pathOf(p.url)}
                      </a>
                      <span className="text-gray-500 text-xs">{pathOf(p.url)}</span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{p.issues}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{p.elements}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{p.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="py-3 px-4 font-normal text-right">Betyg</th>
                  <th className="py-3 px-4 font-normal">Av</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={`border-b border-gray-100 last:border-b-0 ${h.id === run?.id ? "bg-peach/30" : "hover:bg-gray-50"}`}>
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <Link href={`/tillganglighet/${project.id}?run=${h.id}`} className="font-bold hover:text-milou-500">
                        {fmt.format(new Date(h.created_at))}
                      </Link>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-gray-600">{h.final_url}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{h.score}</td>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="font-display font-extrabold text-3xl tabular-nums">{value}</dd>
      <dt className="text-sm text-gray-400 mt-1">{label}</dt>
    </div>
  );
}

function FindingItem({ finding: f, pageCount }: { finding: Finding; pageCount: number }) {
  return (
    <li className="px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`text-xs font-bold px-2 py-0.5 ${f.level === "A" ? "bg-plum text-white" : "bg-peach text-gray-900"}`}>Nivå {f.level}</span>
        <span className="font-bold">{f.title}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1.5 max-w-[80ch]">{f.description}.</p>
      <p className="text-sm text-gray-500 mt-1">
        {f.criteria.map((c, i) => (
          <span key={c}>
            {i > 0 && " · "}
            <a href={criterionUrl(c)} target="_blank" rel="noreferrer" className="underline decoration-gray-300 hover:text-milou-500">
              WCAG {criterionLabel(c)}
            </a>
          </span>
        ))}
        {f.criteria.length > 0 && " · "}
        {f.pages.length} av {pageCount} sidor, {f.count} element
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-bold text-gray-700 hover:text-milou-500">Visa var ({f.examples.length} exempel)</summary>
        <ul className="mt-2 space-y-3">
          {f.examples.map((e, i) => (
            <li key={i} className="bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">{pathOf(e.url)}</p>
              <code className="block mt-1 text-xs break-all text-gray-900">{e.html}</code>
              {e.summary && <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">{e.summary}</p>}
            </li>
          ))}
        </ul>
        {f.helpUrl && (
          <a href={f.helpUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-milou-500">
            Så åtgärdar du det (engelska) <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </details>
    </li>
  );
}
