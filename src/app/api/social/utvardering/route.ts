import { NextRequest, NextResponse } from "next/server";
import { aiEnabled } from "@/lib/audit/ai";
import { MAX_IMAGES, runChecks, type ImageDims } from "@/lib/social/checks";
import { platformById } from "@/lib/social/platforms";
import { reviewPost, scoreOf } from "@/lib/social/review";

export const maxDuration = 120;

const MAX_IMAGE_BYTES = 1_500_000;
// Vercel tar emot högst 4,5 MB per anrop. Texterna är små, bilderna tar plats.
const MAX_TOTAL_BYTES = 4_000_000;
const MAX_TEXT = 6000;
const MAX_BRIEF = 1000;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const field = (form: FormData, name: string, max: number) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

/** JPEG börjar med FF D8 FF. Webbläsaren skickar alltid JPEG, så allt annat avvisas. */
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/**
 * Intern, bakom inloggning via proxy. Granskar ett inlägg (bilder + text) mot
 * en plattform. Mätbara kontroller räknas i kod; Claude bedömer innehållet.
 * Ingenting sparas: varken bilder, text eller resultat.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return fail("BAD_REQUEST");

  const platform = platformById(form.get("platform"));
  if (!platform) return fail("BAD_PLATFORM");

  const text = field(form, "text", MAX_TEXT);
  const goal = field(form, "goal", MAX_BRIEF);
  const audience = field(form, "audience", MAX_BRIEF);
  const brand = field(form, "brand", MAX_BRIEF);

  const files = form.getAll("image").filter((f): f is File => typeof f !== "string");
  if (files.length > MAX_IMAGES) return fail("TOO_MANY_IMAGES");
  if (files.length === 0 && !text) return fail("EMPTY");

  let dims: ImageDims[] = [];
  try {
    const parsed: unknown = JSON.parse(String(form.get("dims") ?? "[]"));
    dims = Array.isArray(parsed)
      ? parsed.map((d) => ({ width: Number((d as ImageDims)?.width), height: Number((d as ImageDims)?.height) }))
      : [];
  } catch {
    return fail("BAD_REQUEST");
  }
  if (dims.length !== files.length || dims.some((d) => !(d.width >= 1 && d.width <= 20000 && d.height >= 1 && d.height <= 20000))) {
    return fail("BAD_REQUEST");
  }

  const images: string[] = [];
  let total = 0;
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) return fail("IMAGE_TOO_LARGE", 413);
    total += f.size;
    if (total > MAX_TOTAL_BYTES) return fail("IMAGE_TOO_LARGE", 413);
    const buf = Buffer.from(await f.arrayBuffer());
    if (!isJpeg(buf)) return fail("BAD_IMAGE");
    images.push(buf.toString("base64"));
  }

  const checks = runChecks(platform, text, dims);

  if (!aiEnabled()) return NextResponse.json({ checks, review: null, score: null, error: "AI_DISABLED" });

  const review = await reviewPost({ platform, text, goal, audience, brand, checks, images });
  return NextResponse.json({
    checks,
    review,
    score: review ? scoreOf(review.categories, checks) : null,
    ...(review ? {} : { error: "AI_FAILED" }),
  });
}
