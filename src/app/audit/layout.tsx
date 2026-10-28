import AuditSubNav from "@/components/audit/AuditSubNav";
import PageHeader from "@/components/PageHeader";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="SEO/GEO-audit"
        description="Betyg för synlighet i Google och i AI-svar, med åtgärder i prioritetsordning."
      />
      <AuditSubNav />
      {children}
    </>
  );
}
