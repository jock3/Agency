import { getSupabaseClient } from "@/lib/supabase/client";
import { PREVIEW_BUCKET } from "@/lib/formatkoll/guard";
import type { Ratio } from "@/lib/formatkoll/placements";
import type {
  FormatkollAsset,
  FormatkollListRow,
  FormatkollProject,
  FormatkollProjectFull,
} from "@/lib/formatkoll/types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP_${res.status}`);
  }
  return res.json();
}

export const listProjects = () => call<FormatkollListRow[]>("/api/formatkoll/projects");

export const getProject = (id: string) =>
  call<FormatkollProjectFull>(`/api/formatkoll/projects/${id}`);

export const createProject = (title: string, clientName: string, days: number) =>
  call<FormatkollProject>("/api/formatkoll/projects", {
    method: "POST",
    body: JSON.stringify({ title, client_name: clientName, days }),
  });

export const updateProject = (id: string, updates: Partial<FormatkollProject>) =>
  call<{ ok: true }>("/api/formatkoll/projects", {
    method: "PATCH",
    body: JSON.stringify({ id, updates }),
  });

export const deleteProject = (id: string) =>
  call<{ ok: true }>("/api/formatkoll/projects", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });

export const deleteAsset = (projectId: string, ratio: Ratio) =>
  call<{ ok: true }>("/api/formatkoll/assets", {
    method: "DELETE",
    body: JSON.stringify({ project_id: projectId, ratio }),
  });

/** Supabase gissar ibland fel på .mov. Sätts typen inte explicit vägrar Safari
 *  ladda filen efteråt. */
function contentTypeFor(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return "video/mp4";
}

/** Läser filmens verkliga mått innan uppladdning, så kundvyn kan rita rätt
 *  proportion direkt i stället för att vänta in videons metadata. */
function readDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (width: number | null, height: number | null) => {
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(v.videoWidth || null, v.videoHeight || null);
    v.onerror = () => done(null, null);
    v.src = url;
  });
}

/**
 * Tre steg: servern signerar en URL, webbläsaren laddar upp direkt mot storage,
 * och först när det gått igenom registreras raden. Filen går aldrig genom en
 * route handler — Vercel tar emot högst 4,5 MB kropp.
 */
export async function uploadAsset(
  projectId: string,
  ratio: Ratio,
  file: File,
): Promise<FormatkollAsset> {
  const { path, token } = await call<{ path: string; token: string }>(
    "/api/formatkoll/upload",
    { method: "POST", body: JSON.stringify({ project_id: projectId, ratio }) },
  );

  const dims = await readDimensions(file);

  const { error } = await getSupabaseClient()
    .storage.from(PREVIEW_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: contentTypeFor(file) });
  if (error) throw new Error(error.message);

  return call<FormatkollAsset>("/api/formatkoll/assets", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      ratio,
      filename: file.name,
      size_bytes: file.size,
      width: dims.width,
      height: dims.height,
    }),
  });
}
