import SectionTabs from "@/components/SectionTabs";

const TABS = [
  { href: "/mediaplan/rapport", label: "Rapport" },
];

/**
 * Flikraden för Mediaplan. Mediaplaner gäller /mediaplan och allt under den
 * (kund, projekt, osorterade), utom rapporterna.
 */
export default function MediaplanTabs() {
  return <SectionTabs tabs={[{ href: "/mediaplan", label: "Mediaplaner", except: ["/mediaplan/rapport"] }, ...TABS]} label="Mediaplan" />;
}
