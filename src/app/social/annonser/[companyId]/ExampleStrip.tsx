"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { MAX_EXAMPLES_PER_TEMPLATE } from "@/lib/ads/asset-types";
import type { AssetView } from "@/lib/ads/assets";
import { ADS_ERRORS, FALLBACK } from "../errors";
import AssetUploader from "./AssetUploader";

/** En exempelpost med en kort anteckning om hur mallen användes. Anteckningen sparas när fältet lämnas. */
function Example({ companyId, example }: { companyId: string; example: AssetView }) {
  const router = useRouter();
  const [note, setNote] = useState(example.description);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/annonser/companies/${companyId}/assets/${example.id}`;

  async function send(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(method === "PATCH" ? "save" : "delete");
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ADS_ERRORS[data.error] ?? FALLBACK);
      else {
        if (method === "PATCH" && data.asset) setNote(data.asset.description);
        router.refresh();
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(null);
    }
  }

  const label = example.description || example.filename || "Exempelpost";

  return (
    <li className="min-w-0">
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {example.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={example.url} alt={label} className="w-full h-full object-contain" />
        ) : null}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            if (confirm("Ta bort exemplet? Det går inte att ångra.")) void send("DELETE");
          }}
          aria-label={`Ta bort exemplet ${example.filename || ""}`.trim()}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-gray-900 text-white hover:bg-milou-600 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-milou-500"
        >
          {busy === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <X className="w-3.5 h-3.5" aria-hidden />}
        </button>
      </div>
      <label htmlFor={`note-${example.id}`} className="sr-only">
        Anteckning om exemplet {example.filename}
      </label>
      <input
        id={`note-${example.id}`}
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note.trim() !== example.description) void send("PATCH", { description: note });
        }}
        placeholder="Anteckning"
        className="mt-1 w-full border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
      />
      <p role="alert" className="text-xs text-milou-600 empty:hidden">
        {error}
      </p>
    </li>
  );
}

/** Exempelposter på en mall: färdiga annonser som visar hur den ska användas. */
export default function ExampleStrip({ companyId, templateId, examples }: { companyId: string; templateId: string; examples: AssetView[] }) {
  const full = examples.length >= MAX_EXAMPLES_PER_TEMPLATE;
  return (
    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
      <h4 className="text-sm font-bold">
        Exempelposter ({examples.length}/{MAX_EXAMPLES_PER_TEMPLATE})
      </h4>
      <p className="text-xs text-gray-600 mb-2">Färdiga annonser som gjorts med mallen. Anteckningen berättar när den passar.</p>
      {examples.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 mb-3">
          {examples.map((e) => (
            <Example key={e.id} companyId={companyId} example={e} />
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-xs text-gray-600">Mallen har {MAX_EXAMPLES_PER_TEMPLATE} exempel, vilket är max.</p>
      ) : (
        <AssetUploader companyId={companyId} kind="example" parentId={templateId} compact />
      )}
    </div>
  );
}
