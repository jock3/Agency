import type { CheckGroup } from "@/lib/audit/types";

type Priority = "critical" | "high" | "medium" | "nice";

interface Action {
  id: string;
  group: CheckGroup;
  title: string;
  detail: string;
  priority: Priority;
}

const PRIORITIES: { key: Priority; label: string; hint: string; accent: string }[] = [
  { key: "critical", label: "Kritiskt", hint: "Hindrar synlighet, åtgärda först", accent: "border-milou-500" },
  { key: "high", label: "Hög", hint: "Stor effekt, bör göras snart", accent: "border-milou-300" },
  { key: "medium", label: "Medel", hint: "Förbättrar betyget märkbart", accent: "border-peach" },
  { key: "nice", label: "Nice to have", hint: "Finputs när resten är klart", accent: "border-gray-300" },
];

/**
 * Intern dashboard för byråns egna SEO/GEO-granskningar. Saknar datakälla än så
 * länge, så betygen och åtgärdslistan renderas tomma.
 */
export default function AuditInternPage() {
  const seoScore: number | null = null;
  const geoScore: number | null = null;
  const actions: Action[] = [];

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">SEO/GEO-audit — internt</h1>
        <p className="text-sm text-gray-500 mt-1">Betyg och prioriterade åtgärder för sajten.</p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <ScoreCard label="SEO" description="Hur väl sajten syns i Google." score={seoScore} />
        <ScoreCard label="GEO" description="Hur väl sajten syns i AI-tjänster som ChatGPT." score={geoScore} />
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
                  <p className="px-4 py-4 text-sm text-gray-400">Inga åtgärder ännu.</p>
                ) : (
                  <ul>
                    {items.map((a) => (
                      <li key={a.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5">
                            {a.group}
                          </span>
                          <span className="font-bold text-sm">{a.title}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{a.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ScoreCard({ label, description, score }: { label: string; description: string; score: number | null }) {
  return (
    <div className="bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{label}</h2>
        <span className="text-xs text-gray-500">av 10</span>
      </div>
      <p className="text-5xl font-bold tabular-nums mt-4">{score ?? "–"}</p>
      <div className="h-1.5 bg-gray-100 mt-4">
        <div className="h-full bg-milou-500" style={{ width: `${((score ?? 0) / 10) * 100}%` }} />
      </div>
      <p className="text-sm text-gray-500 mt-3">{score === null ? "Ingen granskning ännu." : description}</p>
    </div>
  );
}
