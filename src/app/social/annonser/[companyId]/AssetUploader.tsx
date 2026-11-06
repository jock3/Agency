"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ASSET_BUCKET, MAX_ASSET_BYTES, extForFile, type AssetKind } from "@/lib/ads/asset-types";
import { ADS_ERRORS, FALLBACK } from "../errors";

type Status = { name: string; state: "busy" | "done" | "error"; message?: string };

class UploadError extends Error {}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(ADS_ERRORS[data.error] ?? FALLBACK);
  return data as T;
}

function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (width: number | null, height: number | null) => {
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onload = () => done(img.naturalWidth || null, img.naturalHeight || null);
    img.onerror = () => done(null, null);
    img.src = url;
  });
}

/** Tre steg per fil: signerad URL, uppladdning direkt till storage, registrering (där servern kontrollerar filen). */
async function uploadOne(companyId: string, kind: AssetKind, file: File, parentId?: string) {
  const ext = extForFile(file);
  if (!ext) throw new UploadError(ADS_ERRORS.INVALID_FILE);
  if (kind === "overlay" && ext !== "png") throw new UploadError(ADS_ERRORS.OVERLAY_NOT_PNG);
  if (file.size > MAX_ASSET_BYTES) throw new UploadError(ADS_ERRORS.TOO_LARGE);

  const base = `/api/annonser/companies/${companyId}/assets`;
  const { assetId, path, token } = await postJson<{ assetId: string; path: string; token: string }>(`${base}/upload`, {
    kind,
    ext,
    bytes: file.size,
    parentId,
  });
  const { error } = await getSupabaseClient().storage.from(ASSET_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new UploadError(ADS_ERRORS.UPLOAD_MISSING);
  const dims = await dimensions(file);
  await postJson(base, { assetId, kind, ext, filename: file.name, parentId, ...dims });
}

/** Välj eller dra in flera filer. Tre laddas upp åt gången. */
export default function AssetUploader({
  companyId,
  kind,
  parentId,
  compact = false,
}: {
  companyId: string;
  kind: AssetKind;
  /** För exempelposter: mallen de läggs på. */
  parentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = statuses.some((s) => s.state === "busy");

  async function handle(files: File[]) {
    if (files.length === 0 || busy) return;
    setStatuses(files.map((f) => ({ name: f.name, state: "busy" })));
    const set = (i: number, s: Partial<Status>) => setStatuses((prev) => prev.map((p, j) => (j === i ? { ...p, ...s } : p)));
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        try {
          await uploadOne(companyId, kind, files[i], parentId);
          set(i, { state: "done" });
        } catch (err) {
          set(i, { state: "error", message: err instanceof UploadError ? err.message : FALLBACK });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    router.refresh();
  }

  const label = kind === "photo" ? "Ladda upp bilder" : kind === "overlay" ? "Ladda upp PNG-mallar" : "Lägg till exempel";
  const accept = kind === "overlay" ? "image/png" : "image/png,image/jpeg,image/webp";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(Array.from(e.dataTransfer.files));
        }}
        className={`border-2 border-dashed flex flex-wrap items-center gap-x-4 gap-y-2 ${compact ? "px-3 py-3" : "px-5 py-6"} ${dragging ? "border-milou-500 bg-peach/30" : "border-gray-300 bg-white"}`}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
          {label}
        </button>
        {!compact && (
          <p className="text-sm text-gray-600">
            eller dra in filer hit. {kind === "overlay" ? "PNG med genomskinlighet" : "PNG, JPG eller WebP"}, högst 15 MB per fil.
          </p>
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void handle(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {statuses.length > 0 && (
        <ul aria-live="polite" className="mt-2 space-y-1 text-sm">
          {statuses.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              {s.state === "busy" && <Loader2 className="w-4 h-4 animate-spin text-gray-600" aria-hidden />}
              {s.state === "done" && <CheckCircle2 className="w-4 h-4 text-green-700" aria-hidden />}
              {s.state === "error" && <XCircle className="w-4 h-4 text-milou-600" aria-hidden />}
              <span className="truncate max-w-[40ch]">{s.name}</span>
              <span className={s.state === "error" ? "text-milou-600" : "text-gray-600"}>
                {s.state === "busy" ? "laddas upp …" : s.state === "done" ? "klar" : s.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
