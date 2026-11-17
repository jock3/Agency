import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Var man är i flödet: Kunder › Kund › Projekt. Sista ledet är inte en länk. */
export default function MediaplanCrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Var du är" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        <li>
          <Link href="/mediaplan" className="text-gray-600 hover:text-milou-600 hover:underline">Kunder</Link>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden />
            {it.href ? (
              <Link href={it.href} className="text-gray-600 hover:text-milou-600 hover:underline">{it.label}</Link>
            ) : (
              <span aria-current="page" className="font-semibold text-gray-900">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
