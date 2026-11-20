import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { currentUserWithTools } from "@/lib/access/current";
import ResourceBrowser from "./ResourceBrowser";

export const dynamic = "force-dynamic";

/** Samlingssida för resurser: egna skills och länkar, taggade och sökbara. Kräver inloggning. */
export default async function ResourcesPage() {
  const me = await currentUserWithTools();
  if (!me) redirect("/login");

  return (
    <main className="flex-1 bg-gray-50">
      <PageHeader title="Resurser" description="Skills, verktyg, bibliotek och inspiration på ett ställe. Sök, filtrera på typ eller ämne och ladda ner dina egna skills." />
      <ResourceBrowser />
    </main>
  );
}
