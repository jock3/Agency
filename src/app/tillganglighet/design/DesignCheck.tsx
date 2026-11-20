"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AreaReview, Measured, Status } from "@/lib/a11y/design";

interface FrameResult {
  id: string;
  name: string;
  imageUrl: string | null;
  measured: Measured;
  areas: AreaReview[] | null;
}

const ERRORS: Record<string, string> = {
  INVALID_FIGMA_URL: "Det ser inte ut som en Figma-länk. Kopiera länken från Figma (Share → Copy link).",
  FIGMA_DISABLED: "Figma är inte kopplat än. Lägg in FIGMA_TOKEN i miljövariablerna.",
  FIGMA_NO_ACCESS: "Verktygets Figma-konto har inte åtkomst till filen. Dela filen med kontot som äger nyckeln (Can view).",
  FIGMA_NOT_FOUND: "Hittade inte filen eller noden. Kontrollera länken.",
  FIGMA_NO_FRAMES: "Hittade inga frames att granska. Markera en frame i Figma och kopiera länken till den.",
  FIGMA_RATE_LIMIT: "Figma tar emot för många anrop just nu. Prova igen om en stund.",
  FIGMA_ERROR: "Kunde inte läsa från Figma. Försök igen.",
};
const fallback = "Något gick fel. Försök igen.";

const STATUS: Record<Status, { label: string; cls: string }> = {
  ok: { label: "Bra", cls: "bg-gray-100 text-gray-900" },
  improve: { label: "Kan bli bättre", cls: "bg-peach/50 text-gray-900" },
  fix: { label: "Åtgärda", cls: "bg-milou-500 text-white" },
  unknown: { label: "Går inte att avgöra", cls: "bg-gray-100 text-gray-600" },
};

export default function DesignCheck() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ fileName: string; aiEnabled: boolean; frames: FrameResult[] } | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tillganglighet/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? fallback);
      else setResult(data);
    } catch {
      setError(fallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={run} className="flex flex-wrap items-end gap-3">
        <div className="grow max-w-xl">
          <label htmlFor="figma-url" className="block text-sm font-bold mb-1">
            Figma-länk
          </label>
          <input
            id="figma-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.figma.com/design/…?node-id=1-2"
            className="w-full border border-gray-300 px-3 py-2"
          />
        </div>
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 font-bold px-4 py-2 bg-gray-900 text-white hover:bg-milou-500 disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Granskar …" : "Granska designen"}
        </button>
      </form>
      <p className="mt-2 text-sm text-gray-600 max-w-[80ch]">
        Länk till en frame granskar den framen. Länk till en sida eller sektion granskar de första fyra framesen. Designens bild och texter skickas till Anthropic för bedömningen och sparas inte.
      </p>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-4 text-milou-600">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className="mt-8 space-y-10">
          <h2 className="font-bold text-xl">{result.fileName}</h2>
          {!result.aiEnabled && <p className="text-sm text-gray-600">AI är avstängt (ANTHROPIC_API_KEY saknas), så bara de uppmätta kontrollerna visas.</p>}
          {result.frames.map((f) => (
            <FrameCard key={f.id} frame={f} />
          ))}
          <p className="text-sm text-gray-600 max-w-[80ch]">
            En design visar inte hur sidan beter sig. Tangentbord, skärmläsare och zoom går bara att testa på den byggda sidan. Det här är en tidig koll, inget godkännande.
          </p>
        </div>
      )}
    </div>
  );
}

function FrameCard({ frame }: { frame: FrameResult }) {
  const { measured } = frame;
  return (
    <section className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
      <div>
        {frame.imageUrl ? (
          // Figmas egna, tillfälliga bildadresser; next/image är onödigt här.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frame.imageUrl} alt={`Förhandsbild av framen ${frame.name}`} className="w-full border border-gray-200" />
        ) : (
          <p className="text-sm text-gray-600">Ingen förhandsbild kunde skapas.</p>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-lg">{frame.name}</h3>

        <h4 className="mt-4 font-bold text-sm">Uppmätt i kod</h4>
        {measured.findings.length === 0 ? (
          <p className="mt-1 text-sm">Inga brister i de uppmätta kontrollerna ({measured.texts} texter kontrollerade).</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {measured.findings.map((f) => (
              <li key={f.kind + f.examples[0]?.note} className="border-l-2 border-peach pl-4">
                <p className="font-bold">
                  {f.title} <span className="font-normal text-gray-600">({f.count} ställen, WCAG {f.criterion})</span>
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {f.examples.map((ex, i) => (
                    <li key={i}>
                      <span className="font-bold">“{ex.text}”</span> {ex.note}
                      {ex.fix && <span className="block text-gray-600">{ex.fix}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {measured.unassessed > 0 && (
          <p className="mt-2 text-xs text-gray-600">{measured.unassessed} texter över bild, toning eller genomskinlig bakgrund gick inte att mäta. Kontrollera dem för hand.</p>
        )}

        <h4 className="mt-6 font-bold text-sm">Bedömt av AI utifrån bilden</h4>
        {frame.areas ? (
          <ul className="mt-2 space-y-3">
            {frame.areas.map((a) => (
              <li key={a.area}>
                <p className="flex flex-wrap items-center gap-2 font-bold text-sm">
                  {a.area}
                  <span className={`px-2 py-0.5 text-xs ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                </p>
                {a.note && <p className="mt-0.5 text-sm max-w-[80ch]">{a.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-gray-600">Ingen AI-bedömning gick att ta fram för den här framen.</p>
        )}
      </div>
    </section>
  );
}
