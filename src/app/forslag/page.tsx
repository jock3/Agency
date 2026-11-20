import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { currentUserWithTools } from "@/lib/access/current";
import RequestsBoard from "./RequestsBoard";

export const dynamic = "force-dynamic";

/** Förslag på nya verktyg och ändringar i dagens. Alla inloggade ser alla förslag och kan rösta. */
export default async function RequestsPage() {
  const me = await currentUserWithTools();
  if (!me) redirect("/login");

  return (
    <main className="flex-1 bg-gray-50">
      <PageHeader title="Förslag" description="Saknar du ett verktyg, eller vill du ändra något i ett som finns? Skicka in det här, och rösta på det du vill se." />
      <RequestsBoard />
    </main>
  );
}
