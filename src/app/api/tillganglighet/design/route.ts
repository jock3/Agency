import { NextRequest, NextResponse } from "next/server";
import { measure, reviewDesign } from "@/lib/a11y/design";
import { FigmaError, figmaEnabled, loadFrames, parseFigmaUrl } from "@/lib/a11y/figma";
import { aiEnabled } from "@/lib/audit/ai";

export const maxDuration = 120;

/**
 * Intern, bakom inloggning via proxy. Tillgänglighetskoll på en Figma-design:
 * färger och mått mäts i kod, resten bedöms av Claude utifrån en bild. Inget
 * sparas; designens bild och texter skickas bara till Anthropic för bedömningen.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const target = typeof body?.url === "string" ? parseFigmaUrl(body.url) : null;
  if (!target) return NextResponse.json({ error: "INVALID_FIGMA_URL" }, { status: 422 });
  if (!figmaEnabled()) return NextResponse.json({ error: "FIGMA_DISABLED" }, { status: 503 });

  try {
    const { fileName, frames } = await loadFrames(target.fileKey, target.nodeId);
    const ai = aiEnabled();
    const results = await Promise.all(
      frames.map(async (frame) => {
        const measured = measure(frame.node);
        return { id: frame.id, name: frame.name, imageUrl: frame.imageUrl, measured, areas: ai ? await reviewDesign(frame, measured) : null };
      }),
    );
    console.log(`a11y design file=${target.fileKey} frames=${frames.length}`);
    return NextResponse.json({ fileName, aiEnabled: ai, frames: results });
  } catch (err) {
    if (err instanceof FigmaError) {
      const status = err.code === "FIGMA_RATE_LIMIT" ? 429 : err.code === "FIGMA_ERROR" ? 502 : err.code === "FIGMA_NOT_FOUND" ? 404 : 422;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
