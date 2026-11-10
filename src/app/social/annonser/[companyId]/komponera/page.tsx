import { redirect } from "next/navigation";

/** Gamla adressen till annonsskaparen. Den ligger nu på företagets startsida. */
export default async function OldComposePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  redirect(`/social/annonser/${encodeURIComponent(companyId)}`);
}
