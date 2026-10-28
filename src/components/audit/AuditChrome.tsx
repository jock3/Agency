"use client";

import { usePathname } from "next/navigation";
import AuditSubNav from "./AuditSubNav";
import PageHeader from "@/components/PageHeader";

/** Ett projekts sida har en egen mörk rubrikyta, så där visas bara flikarna. */
const isProjectPage = (pathname: string) => /^\/audit\/intern\/[^/]+/.test(pathname);

export default function AuditChrome() {
  const pathname = usePathname();
  return (
    <>
      {!isProjectPage(pathname) && (
        <PageHeader
          title="SEO/GEO-audit"
          description="Betyg för synlighet i Google och i AI-svar, med åtgärder i prioritetsordning."
        />
      )}
      <AuditSubNav />
    </>
  );
}
