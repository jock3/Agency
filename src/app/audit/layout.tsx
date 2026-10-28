import AuditChrome from "@/components/audit/AuditChrome";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuditChrome />
      {children}
    </>
  );
}
