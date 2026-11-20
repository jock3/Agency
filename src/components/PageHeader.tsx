/**
 * Mörkt sidhuvud för verktygssidorna, som heron på milou.se:s tjänstesidor:
 * en etikett i versaler, rubriken stort, en mening om vad verktyget gör och en
 * valfri primärknapp till höger.
 */
export default function PageHeader({
  title,
  description,
  action,
  kicker = "Milou AI-hub",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Etiketten ovanför rubriken. */
  kicker?: string;
}) {
  return (
    <header className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-10 pb-9 md:pt-14 md:pb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="milou-kicker">{kicker}</p>
          <h1 className="milou-display-sm mt-3">{title}</h1>
          {description && <p className="mt-3 text-white/90 max-w-[60ch] md:text-lg">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Primärknapp för PageHeader: persika på mörk botten, som knapparna i milou.se:s hero. */
export function PageHeaderButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="milou-btn milou-btn-peach">
      {children}
    </button>
  );
}
