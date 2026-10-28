/**
 * Mörkt sidhuvud för verktygssidorna, i samma uttryck som hubben: rubrik i
 * REM, en mening om vad verktyget gör och en valfri primärknapp till höger.
 */
export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-3xl sm:text-[40px] sm:leading-[45px]">{title}</h1>
          {description && <p className="mt-2 text-gray-400 max-w-[60ch]">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Röd primärknapp för PageHeader, som CTA-knapparna på milou.se. */
export function PageHeaderButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="bg-milou-500 hover:bg-milou-600 text-white h-11 px-5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach"
    >
      {children}
    </button>
  );
}
