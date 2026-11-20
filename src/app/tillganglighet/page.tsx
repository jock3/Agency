import Link from "next/link";
import { ArrowRight, Globe, PenTool } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const CARDS = [
  {
    href: "/tillganglighet/sajt",
    label: "Testa sajt",
    does: "Granska en färdig sajt mot WCAG 2.2 AA i en riktig webbläsare, med betyg och åtgärder i prioritetsordning.",
    Icon: Globe,
  },
  {
    href: "/tillganglighet/design",
    label: "Testa design",
    does: "Klistra in en Figma-länk och kolla kontrast, storlekar och läsbarhet innan något är byggt.",
    Icon: PenTool,
  },
];

/** Startsidan i tillgänglighetsverktyget: välj mellan att testa en färdig sajt eller en design. */
export default function A11yStartPage() {
  return (
    <>
      <PageHeader title="Tillgänglighet" description="Testa en färdig sajt eller en design i Figma." />
      <main className="max-w-6xl w-full mx-auto px-6 py-14">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-16 max-w-3xl">
          {CARDS.map((c) => (
            <li key={c.href} className="milou-plate bg-white">
              <Link
                href={c.href}
                className="group h-full flex flex-col gap-5 p-7 md:p-8 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-milou-500"
              >
                <c.Icon aria-hidden className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
                <div className="flex-1">
                  <h2 className="font-display font-extrabold text-2xl leading-tight text-gray-900">{c.label}</h2>
                  <p className="mt-2 text-gray-600 leading-6">{c.does}</p>
                </div>
                <span aria-hidden className="w-14 h-14 bg-milou-500 group-hover:bg-milou-600 transition-colors flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-white transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
