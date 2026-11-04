import SocialChrome from "@/components/social/SocialChrome";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SocialChrome />
      {children}
    </>
  );
}
