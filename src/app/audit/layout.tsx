import AuditChrome from "@/components/audit/AuditChrome";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="audit-a11y contents">
        <AuditChrome />
        {children}
      </div>
    </>
  );
}
