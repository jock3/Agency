"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { SOURCE_NAMES, formatBytes, type AssetSource } from "@/lib/ads/asset-types";
import type { AssetView } from "@/lib/ads/assets";
import { ADS_ERRORS, FALLBACK } from "../errors";

const field =
  "w-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";

/** En bild eller mall: förhandsvisning, beskrivning, taggar, källa och borttagning. */
export default function AssetCard({ companyId, asset }: { companyId: string; asset: AssetView }) {
  const router = useRouter();
  const [description, setDescription] = useState(asset.description);
  const [tags, setTags] = useState(asset.tags.join(", "));
  const [source, setSource] = useState<AssetSource>(asset.source);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  const dirty = description !== asset.description || tagList.join(",") !== asset.tags.join(",") || source !== asset.source;
  const url = `/api/annonser/companies/${companyId}/assets/${asset.id}`;
  const idBase = `a-${asset.id}`;

  async function send(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(method === "PATCH" ? "save" : "delete");
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ADS_ERRORS[data.error] ?? FALLBACK);
      else {
        if (method === "PATCH" && data.asset) {
          setDescription(data.asset.description);
          setTags((data.asset.tags as string[]).join(", "));
          setSource(data.asset.source);
          setSaved(true);
        }
        router.refresh();
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(null);
    }
  }

  const label = asset.description || asset.filename || "Bild utan beskrivning";

  return (
    <li className="bg-white flex flex-col">
      <div className={`aspect-square flex items-center justify-center overflow-hidden ${asset.kind === "overlay" ? "bg-checker" : "bg-gray-100"}`}>
        {asset.url ? (
          // Signerade URL:er från privat storage; next/image skulle cacha dem förbi sin livstid.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={label} loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <span className="text-sm text-gray-600">Förhandsvisning saknas</span>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) void send("PATCH", { description, tags: tagList, source });
        }}
        className="p-4 flex flex-col gap-2 flex-1"
      >
        <p className="text-xs text-gray-600 truncate" title={asset.filename}>
          {asset.filename || "namnlös"} · {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
          {formatBytes(asset.bytes)}
        </p>
        <label htmlFor={`${idBase}-desc`} className="text-sm font-bold">
          Beskrivning
        </label>
        <textarea
          id={`${idBase}-desc`}
          rows={2}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={asset.kind === "photo" ? "Vad visar bilden? Till exempel: kvinna i vinterjacka på snöig gata" : "Hur ser mallen ut? Till exempel: röd banderoll nertill"}
          className={field}
        />
        <label htmlFor={`${idBase}-tags`} className="text-sm font-bold">
          Taggar <span className="font-normal text-gray-600">(skilj med komma)</span>
        </label>
        <input id={`${idBase}-tags`} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vinter, däck, kampanj" className={field} />
        <label htmlFor={`${idBase}-src`} className="text-sm font-bold">
          Källa
        </label>
        <select id={`${idBase}-src`} value={source} onChange={(e) => setSource(e.target.value as AssetSource)} className={field}>
          {(Object.keys(SOURCE_NAMES) as AssetSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_NAMES[s]}
            </option>
          ))}
        </select>
        <div className="mt-auto pt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={!dirty || !!busy}
            className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white px-3 py-1.5"
          >
            {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Spara
          </button>
          {saved && !dirty && (
            <span role="status" className="text-sm text-gray-600">
              Sparat
            </span>
          )}
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              if (confirm(`Ta bort ${asset.filename || "bilden"}? Det går inte att ångra.`)) void send("DELETE");
            }}
            aria-label={`Ta bort ${asset.filename || "bilden"}`}
            className="ml-auto w-8 h-8 flex items-center justify-center text-gray-600 hover:text-milou-600 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
          >
            {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Trash2 className="w-4 h-4" aria-hidden />}
          </button>
        </div>
        <p role="alert" className="text-sm text-milou-600 empty:hidden">
          {error}
        </p>
      </form>
    </li>
  );
}
