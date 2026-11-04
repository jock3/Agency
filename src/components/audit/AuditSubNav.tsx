"use client";

import SectionTabs from "@/components/SectionTabs";

const TABS = [
  { href: "/audit/extern", label: "Externt verktyg" },
  { href: "/audit/intern", label: "Internt verktyg" },
];

export default function AuditSubNav() {
  return <SectionTabs tabs={TABS} label="SEO/GEO-audit" />;
}
