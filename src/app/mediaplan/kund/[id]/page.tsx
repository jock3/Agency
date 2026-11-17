import ClientStep from "./ClientStep";

/** Steg 2: kundens projekt. */
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientStep id={id} />;
}
