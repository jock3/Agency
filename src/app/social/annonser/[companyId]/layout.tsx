import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, membersOf, memberCompany } from "@/lib/ads/access";
import { listAssets } from "@/lib/ads/assets";
import { COMPANY_QUOTA_BYTES, formatBytes } from "@/lib/ads/asset-types";
import CompanyTabs from "./CompanyTabs";

export const dynamic = "force-dynamic";

/**
 * Ramen för ett företag: namn, flikar och lagring. Bara medlemmar: för alla
 * andra, och för id:n som inte finns, är svaret 404. Varje sida kontrollerar
 * medlemskapet igen, eftersom en layout inte skyddar sidorna under sig.
 */
export default async function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  const [members, assets] = await Promise.all([membersOf(company.id), listAssets(company.id)]);
  const used = assets.reduce((s, a) => s + a.bytes, 0);

  return (
    <main className="max-w-7xl w-full mx-auto px-6 py-8">
      <Link href="/social/annonser" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Alla företag
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mt-3">
        <h2 className="text-2xl font-bold">{company.name}</h2>
        <p className="text-xs text-gray-600">
          Medlemmar: {members.map((m) => m.name).join(", ") || "inga"} · Lagring: {formatBytes(used)} av {formatBytes(COMPANY_QUOTA_BYTES)}
        </p>
      </div>
      <CompanyTabs
        companyId={company.id}
        counts={{ photos: assets.filter((a) => a.kind === "photo").length, templates: assets.filter((a) => a.kind === "overlay").length }}
      />
      <div className="pt-6">{children}</div>
    </main>
  );
}
