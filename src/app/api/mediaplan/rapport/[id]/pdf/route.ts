import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { normalizeDoc } from "@/lib/report/doc";
import { fileBase } from "@/lib/report/project";
import { renderPdf } from "@/lib/report/pdf";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Webbläsaren behöver start och typsnittet hämtas utifrån.
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

/**
 * Skapar PDF:en. Dokumentet kommer i anropet, så att PDF:en visar exakt det som
 * syns i editorn, också innan autosparningen hunnit ikapp. Det rensas av
 * normalizeDoc som vid sparning. Kräver medlemskap i rapportens företag.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!isUuid(id)) return adsError("NOT_FOUND", 404);

  const { data } = await getSupabaseAdminClient().from("report_docs").select("company_id").eq("id", id).maybeSingle();
  if (!data || !(await memberCompany(user.user_id, data.company_id as string))) return adsError("NOT_FOUND", 404);

  const body = await request.json().catch(() => null);
  const doc = normalizeDoc(body?.doc);
  if (!doc) return adsError("INVALID_DOC");
  if (doc.sections.length === 0) return adsError("EMPTY");

  try {
    const { pdf, fontOk } = await renderPdf(doc);
    const name = `${fileBase(doc)}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
        "X-Font-Ok": fontOk ? "1" : "0",
      },
    });
  } catch (err) {
    console.error("PDF-export misslyckades", err);
    return adsError("PDF_FAILED", 500);
  }
}
