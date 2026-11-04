import PageHeader from "@/components/PageHeader";
import SectionTabs from "@/components/SectionTabs";

const TABS = [{ href: "/social/utvardering", label: "Utvärdering" }];

/** Sidhuvud och flikrad för Social media-sektionen. Fler verktyg läggs till i TABS. */
export default function SocialChrome() {
  return (
    <>
      <PageHeader
        title="Social media"
        description="Verktyg för inlägg i sociala kanaler. Börja med att få en granskning av grafik och text före publicering."
      />
      <SectionTabs tabs={TABS} label="Social media" />
    </>
  );
}
