"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Link2 } from "lucide-react";
import PreviewWorkspace, { emptyAssets, type AssetMap } from "@/components/formatkoll/PreviewWorkspace";
import { RATIOS, type NaturalSize, type Ratio } from "@/lib/formatkoll/placements";
import { kindOfPath } from "@/lib/formatkoll/media";
import { publicAssetUrl } from "@/lib/formatkoll/urls";
import { getProject, updateProject, uploadAsset } from "@/lib/api/formatkoll";
import type { FormatkollProjectFull } from "@/lib/formatkoll/types";

const DAY = 24 * 60 * 60 * 1000;
const SAVE_DELAY = 700;

function expiryText(expiresAt: string): { text: string; expired: boolean } {
  const left = Date.parse(expiresAt) - Date.now();
  if (left <= 0) return { text: "Länken har gått ut", expired: true };
  const days = Math.ceil(left / DAY);
  return { text: days === 1 ? "Länken gäller 1 dag till" : `Länken gäller ${days} dagar till`, expired: false };
}

export default function FormatkollEditor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<FormatkollProjectFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [caption, setCaption] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyRatio, setBusyRatio] = useState<Ratio | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getProject(projectId)
      .then((p) => {
        setProject(p);
        setClientName(p.client_name);
        setCaption(p.caption);
        setCaptions(p.captions ?? {});
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId]);

  // Text sparas avstannat, inte per tangenttryck — annars blir det ett anrop
  // per bokstav mot ett fält som ändå bara läses av delningslänken.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = useCallback(
    (updates: { client_name?: string; caption?: string; captions?: Record<string, string> }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setSaving(true);
        updateProject(projectId, updates)
          .catch((e: Error) => setError(e.message))
          .finally(() => setSaving(false));
      }, SAVE_DELAY);
    },
    [projectId],
  );

  const assets: AssetMap = emptyAssets();
  const naturals: Partial<Record<Ratio, NaturalSize>> = {};
  for (const a of project?.assets ?? []) {
    assets[a.ratio] = {
      url: publicAssetUrl(a.storage_path, a.updated_at),
      name: a.filename,
      kind: kindOfPath(a.storage_path),
      sizeBytes: a.size_bytes ?? undefined,
    };
    if (a.width && a.height) naturals[a.ratio] = { w: a.width, h: a.height };
  }

  const pickFile = useCallback(
    async (ratio: Ratio, file: File) => {
      setBusyRatio(ratio);
      setError(null);
      try {
        await uploadAsset(projectId, ratio, file);
        setProject(await getProject(projectId));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyRatio(null);
      }
    },
    [projectId],
  );

  async function extend(days: number) {
    const expires = new Date(Date.now() + days * DAY).toISOString();
    setSaving(true);
    try {
      await updateProject(projectId, { expires_at: expires });
      setProject((p) => (p ? { ...p, expires_at: expires } : p));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!project) return;
    navigator.clipboard.writeText(`${location.origin}/share/kund/${project.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (error && !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-lg font-semibold text-gray-700">Kunde inte öppna projektet</h1>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
          <Link href="/formatkoll" className="text-sm text-milou-500 mt-4 inline-block">
            Till projektlistan
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Laddar…</div>;
  }

  const expiry = expiryText(project.expires_at);
  const uploaded = RATIOS.filter((r) => assets[r]).length;

  const headerLeft = (
    <div className="flex items-center gap-4 min-w-0 mr-2">
      <Link
        href="/formatkoll"
        aria-label="Till alla projekt"
        className="shrink-0 w-10 h-10 flex items-center justify-center border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="font-display font-extrabold text-xl leading-tight truncate">{project.title}</h1>
        <p className="text-[13px] text-gray-600 truncate">
          {clientName || "Ingen kund angiven"}
          <span className="text-gray-400">, {uploaded} av 3 format</span>
        </p>
      </div>
    </div>
  );

  const status = busyRatio ? `Laddar upp ${busyRatio}…` : saving ? "Sparar…" : null;

  const header = (
    <div className="flex items-center gap-4 text-[13px]">
      {status && <span className="text-gray-500">{status}</span>}
      {error && <span className="text-milou-600">{error}</span>}
      <div className="flex items-center gap-2">
        <span className={expiry.expired ? "text-milou-600 font-bold" : "text-gray-600"}>{expiry.text}</span>
        <span className="flex border border-gray-200" role="group" aria-label="Förläng länken">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => extend(d)}
              className="px-2.5 h-8 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-l border-gray-200 first:border-l-0"
              title={`Låt länken gälla ${d} ${d === 1 ? "dag" : "dagar"} från nu`}
            >
              {d} d
            </button>
          ))}
        </span>
      </div>
      <button
        type="button"
        onClick={copyLink}
        className="h-10 px-4 flex items-center gap-2 bg-milou-500 text-white font-bold hover:bg-milou-600 transition-colors"
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied ? "Länken är kopierad" : "Kopiera kundlänk"}
      </button>
    </div>
  );

  return (
    <PreviewWorkspace
      assets={assets}
      initialNaturals={naturals}
      clientName={clientName}
      caption={caption}
      onPickFile={pickFile}
      onClientNameChange={(v) => {
        setClientName(v);
        queueSave({ client_name: v });
      }}
      onCaptionChange={(v) => {
        setCaption(v);
        queueSave({ caption: v });
      }}
      captions={captions}
      onCaptionOverride={(placementId, value) => {
        // null tar bort nyckeln helt — kanalen ska ärva den delade texten igen,
        // inte spara en tom sträng som är en giltig egen text.
        const next = { ...captions };
        if (value === null) delete next[placementId];
        else next[placementId] = value;
        setCaptions(next);
        queueSave({ captions: next });
      }}
      headerLeft={headerLeft}
      headerRight={header}
      busyRatio={busyRatio}
    />
  );
}
