import { redirect } from "next/navigation";

/** Delade mediaplaner visas i den nya Mediaplan-appen, som läser samma share_token. */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`https://mediaplan.milou.se/share/${encodeURIComponent(token)}`);
}
