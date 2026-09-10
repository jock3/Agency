"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PreviewWorkspace, { emptyAssets, type AssetMap } from "@/components/formatkoll/PreviewWorkspace";
import { RATIOS, type NaturalSize, type Ratio } from "@/lib/formatkoll/placements";
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

  const header = (
    <div className="flex items-center gap-3 text-[13px]">
      <Link href="/formatkoll" className="text-[#a2a4a9] hover:text-white transition-colors">
        ← Projekt
      </Link>
      <span className="font-semibold">{project.title}</span>
      <span className="text-[#a2a4a9]">{uploaded}/3 filer</span>
      {busyRatio && <span className="text-[#ffd23f]">Laddar upp {busyRatio}…</span>}
      {saving && !busyRatio && <span className="text-[#a2a4a9]">Sparar…</span>}
      {error && <span className="text-[#ff6b6b]">{error}</span>}
      <span className={expiry.expired ? "text-[#ff6b6b]" : "text-[#a2a4a9]"}>{expiry.text}</span>
      <span className="flex items-center gap-1">
        {[1, 3, 7].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => extend(d)}
            className="px-2 py-0.5 rounded border border-white/15 text-[#d6d7d9] hover:bg-white/10 transition-colors"
            title={`Sätt utgång till ${d} dagar från nu`}
          >
            {d}d
          </button>
        ))}
      </span>
      <button
        type="button"
        onClick={copyLink}
        className="px-3 py-1 rounded bg-milou-500 text-white font-medium hover:bg-milou-600 transition-colors"
      >
        {copied ? "Kopierad" : "Kopiera delningslänk"}
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
      headerRight={header}
    />
  );
}
