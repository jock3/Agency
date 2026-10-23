import AuditSubNav from "@/components/audit/AuditSubNav";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuditSubNav />
      {children}
    </>
  );
}
