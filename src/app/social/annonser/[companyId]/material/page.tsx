import { notFound, redirect } from "next/navigation";
import { currentUser, memberCompany } from "@/lib/ads/access";
import { getBrand } from "@/lib/ads/brand";
import BrandEditor from "./BrandEditor";

export const dynamic = "force-dynamic";

/** Ton och bildspråk: skrivguide, förebilder och bildspråk som AI:n följer. Bara medlemmar (annars 404). */
export default async function MaterialPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { companyId } = await params;
  const company = await memberCompany(user.user_id, companyId);
  if (!company) notFound();
  return <BrandEditor companyId={company.id} initial={await getBrand(company.id)} />;
}
