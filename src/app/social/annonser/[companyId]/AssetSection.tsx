import type { AssetView } from "@/lib/ads/assets";
import AssetCard from "./AssetCard";
import AssetUploader from "./AssetUploader";

/** Uppladdning och rutnät för en sorts tillgång (bilder eller mallar). */
export default function AssetSection({
  companyId,
  kind,
  intro,
  items,
  empty,
  examplesOf,
}: {
  companyId: string;
  kind: "photo" | "overlay";
  intro: string;
  items: AssetView[];
  empty: string;
  examplesOf?: (id: string) => AssetView[];
}) {
  return (
    <section aria-label={kind === "photo" ? "Bildbanken" : "Mallar"}>
      <p className="text-sm text-gray-600 mb-3 max-w-[70ch]">{intro}</p>
      <AssetUploader companyId={companyId} kind={kind} />
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => (
            <AssetCard key={a.id} companyId={companyId} asset={a} examples={examplesOf?.(a.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}
