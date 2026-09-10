import type { ChromeKind } from "@/lib/formatkoll/placements";

const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const Heart = <Icon d={<path d="M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 5 8.8 10.4 8.8 10.4s8.8-5.4 8.8-10.4z" />} />;
const Chat = <Icon d={<path d="M21 11.5a8 8 0 0 1-11.6 7.2L3 20.5l1.9-6A8 8 0 1 1 21 11.5z" />} />;
const Share = (
  <Icon
    d={
      <>
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 15V3" />
        <path d="m8 7 4-4 4 4" />
      </>
    }
  />
);
const More = (
  <Icon
    d={
      <>
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="19" r="1" />
      </>
    }
  />
);

const ActionRail = () => (
  <div className="fk-actionrail">
    <span className="fk-avatar" />
    <span className="fk-act">
      {Heart}
      <i>12,4t</i>
    </span>
    <span className="fk-act">
      {Chat}
      <i>318</i>
    </span>
    <span className="fk-act">
      {Share}
      <i>Dela</i>
    </span>
    <span className="fk-act">{More}</span>
  </div>
);

const StatusBar = () => (
  <div className="fk-statusbar">
    <span>09:41</span>
    <span>5G ▮▮▮</span>
  </div>
);

const BottomText = ({ handle, caption }: { handle: string; caption: string }) => (
  <div className="fk-bottomtext">
    <div className="fk-handle">@{handle}</div>
    <div className="fk-cap">{caption}</div>
  </div>
);

const Tabs = () => (
  <div className="fk-tabs">
    <span>Följer</span>
    <span className="fk-on">För dig</span>
  </div>
);

const NavBar = ({ items }: { items: string[] }) => (
  <div className="fk-navbar">
    {items.map((i) => (
      <span key={i}>{i}</span>
    ))}
  </div>
);

/**
 * Gränssnittsoverlay per helskärmsplacering. Kortplaceringarna
 * (igfeed/lifeed/fbfeed) ritas av FeedCard i stället.
 */
export default function Chrome({
  kind,
  handle,
  caption,
}: {
  kind: ChromeKind;
  handle: string;
  caption: string;
}) {
  switch (kind) {
    case "reels":
      return (
        <>
          <StatusBar />
          <Tabs />
          <ActionRail />
          <BottomText handle={handle} caption={caption} />
          <NavBar items={["Hem", "Sök", "Reels", "Inkorg", "Profil"]} />
        </>
      );
    case "tiktok":
      return (
        <>
          <StatusBar />
          <Tabs />
          <ActionRail />
          <BottomText handle={handle} caption={caption} />
          <NavBar items={["Hem", "Vänner", "+", "Inkorg", "Profil"]} />
        </>
      );
    case "shorts":
      return (
        <>
          <StatusBar />
          <ActionRail />
          <div className="fk-shortstitle">
            {caption}
            <br />
            <span style={{ fontWeight: 400, opacity: 0.85 }}>@{handle}</span>
          </div>
        </>
      );
    case "stories":
      return (
        <>
          <StatusBar />
          <div className="fk-progress">
            <i className="fk-on" />
            <i />
            <i />
          </div>
          <div className="fk-storyhead">
            <span className="fk-avatar fk-sm" />
            {handle}
            <span style={{ opacity: 0.7, fontWeight: 400 }}>2 tim</span>
          </div>
          <div className="fk-replybar">Skicka meddelande</div>
        </>
      );
    case "snap":
      return (
        <>
          <StatusBar />
          <div className="fk-snaphead">
            <span className="fk-avatar fk-xs" />
            {handle}
          </div>
          <ActionRail />
          <div className="fk-bottomtext" style={{ bottom: "6%" }}>
            <div className="fk-cap">{caption}</div>
          </div>
        </>
      );
    default:
      return null;
  }
}
