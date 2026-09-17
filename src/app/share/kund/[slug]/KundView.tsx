"use client";

import MilouLogo from "@/components/MilouLogo";
import PreviewWorkspace, { emptyAssets, type AssetMap } from "@/components/formatkoll/PreviewWorkspace";
import type { NaturalSize, Ratio } from "@/lib/formatkoll/placements";

interface Preview {
  title: string;
  clientName: string;
  caption: string;
  captions: Record<string, string>;
  assets: { ratio: Ratio; url: string; name: string; width: number | null; height: number | null }[];
}

/** Samma preview som redaktören ser, i skrivskyddat läge. Skillnaden är bara
 *  readOnly-flaggan — ingen parallell komponentträd att hålla i synk. */
export default function KundView({ preview }: { preview: Preview }) {
  const assets: AssetMap = emptyAssets();
  const naturals: Partial<Record<Ratio, NaturalSize>> = {};
  for (const a of preview.assets) {
    assets[a.ratio] = { url: a.url, name: a.name };
    if (a.width && a.height) naturals[a.ratio] = { w: a.width, h: a.height };
  }

  const header = (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="font-semibold">{preview.title}</span>
      {preview.clientName && <span className="text-gray-400">{preview.clientName}</span>}
      <MilouLogo className="h-3.5 w-auto text-white opacity-70" />
    </div>
  );

  return (
    <PreviewWorkspace
      assets={assets}
      initialNaturals={naturals}
      clientName={preview.clientName}
      caption={preview.caption}
      captions={preview.captions}
      readOnly
      headerRight={header}
    />
  );
}
