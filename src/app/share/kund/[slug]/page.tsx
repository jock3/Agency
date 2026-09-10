import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { publicAssetUrl } from "@/lib/formatkoll/urls";
import type { Ratio } from "@/lib/formatkoll/placements";
import type { FormatkollAsset, FormatkollProject } from "@/lib/formatkoll/types";
import KundView from "./KundView";

interface Preview {
  title: string;
  clientName: string;
  caption: string;
  captions: Record<string, string>;
  assets: { ratio: Ratio; url: string; name: string; width: number | null; height: number | null }[];
}

/**
 * Sluggen är hela åtkomstkontrollen: den som har länken kommer in. Därför läses
 * projektet med service-role och filtreras här, i stället för att exponera
 * tabellen för anon — en anonym select utan filter hade annars kunnat räkna upp
 * alla projekt, och RLS kan inte uttrycka "du måste känna till sluggen".
 */
async function loadPreview(slug: string): Promise<Preview | null> {
  const sb = getSupabaseAdminClient();
  const { data: project, error } = await sb
    .from("formatkoll_projects")
    .select("*")
    .eq("slug", slug)
    .is("archived_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<FormatkollProject>();
  if (error || !project) return null;

  const { data: assets } = await sb
    .from("formatkoll_assets")
    .select("*")
    .eq("project_id", project.id);

  return {
    title: project.title,
    clientName: project.client_name,
    caption: project.caption,
    captions: project.captions ?? {},
    assets: ((assets ?? []) as FormatkollAsset[]).map((a) => ({
      ratio: a.ratio,
      url: publicAssetUrl(a.storage_path, a.updated_at),
      name: a.filename,
      width: a.width,
      height: a.height,
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await loadPreview(slug);
  if (!preview) return { title: "Formatkoll" };
  const title = preview.clientName ? `${preview.title} — ${preview.clientName}` : preview.title;
  return {
    title,
    description: "Förhandsvisning av rörligt material i sociala placeringar.",
    openGraph: { title, description: "Förhandsvisning av rörligt material i sociala placeringar." },
    robots: { index: false, follow: false },
  };
}

export default async function KundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = await loadPreview(slug);

  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Länken är inte giltig</h1>
          <p className="text-gray-400 text-sm mt-1">
            Den kan ha gått ut eller så är projektet borttaget. Hör av dig till din kontakt på Milou.
          </p>
        </div>
      </div>
    );
  }

  return <KundView preview={preview} />;
}
