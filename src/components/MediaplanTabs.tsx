import SectionTabs from "@/components/SectionTabs";

const TABS = [
  { href: "/mediaplan/rapport", label: "Rapport" },
];

/**
 * Flikraden för Mediaplan. Mediaplaner ligger på /mediaplan, som också är
 * början på rapportens adress, så den fliken matchas separat.
 */
export default function MediaplanTabs() {
  return <SectionTabs tabs={[{ href: "/mediaplan", label: "Mediaplaner", exact: true }, ...TABS]} label="Mediaplan" />;
}
