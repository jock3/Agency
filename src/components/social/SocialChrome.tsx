import PageHeader from "@/components/PageHeader";
import SectionTabs from "@/components/SectionTabs";

const TABS = [
  { href: "/social/utvardering", label: "Utvärdering" },
  { href: "/social/annonser", label: "Annonsverktyg" },
];

/** Sidhuvud och flikrad för Social media-sektionen. Fler verktyg läggs till i TABS. */
export default function SocialChrome() {
  return (
    <>
      <PageHeader
        title="Social media"
        description="Verktyg för inlägg i sociala kanaler. Granska inlägg före publicering och bygg annonser i varumärkets stil."
      />
      <SectionTabs tabs={TABS} label="Social media" />
    </>
  );
}
