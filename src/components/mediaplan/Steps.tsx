import Link from "next/link";
import { Check } from "lucide-react";

/** Steg 1–3. Avklarade steg är svarta med bock och går att klicka på, det aktiva är rött, kommande är gråa. */
export default function Steps({ current, client, project }: { current: 1 | 2 | 3; client?: { name: string; href: string }; project?: { name: string; href: string } }) {
  const steps: { n: 1 | 2 | 3; title: string; sub: string; href?: string }[] = [
    { n: 1, title: "Välj kund", sub: current === 1 ? "Du är här" : client?.name ?? "Välj kund", href: current > 1 ? "/mediaplan" : undefined },
    { n: 2, title: "Välj projekt", sub: current === 2 ? "Du är här" : current > 2 ? project?.name ?? "Valt projekt" : "Kundens projekt", href: current > 2 ? client?.href : undefined },
    { n: 3, title: "Årsplan och kampanjer", sub: current === 3 ? "Du är här" : "Mediaplan per år" },
  ];
  return (
    <ol aria-label="Steg" className="list-none m-0 p-0 flex flex-wrap items-center gap-[18px]">
      {steps.map((s) => {
        const state = s.n < current ? "done" : s.n === current ? "now" : "todo";
        const box = (
          <span aria-hidden className={`w-[38px] h-[38px] grid place-items-center shrink-0 text-base font-extrabold ${state === "now" ? "bg-[#E60330] text-white" : state === "done" ? "bg-gray-900 text-white" : "bg-[#DADADA] text-gray-900"}`}>
            {state === "done" ? <Check className="w-4 h-4" strokeWidth={2.4} /> : s.n}
          </span>
        );
        const text = (
          <span className="flex flex-col">
            <strong className={`text-base ${state === "now" ? "font-extrabold" : "font-bold"}`}>{s.title}</strong>
            <span className="text-[13px] text-gray-600">{s.sub}</span>
          </span>
        );
        return (
          <li key={s.n} aria-current={state === "now" ? "step" : undefined} className="flex items-center gap-3">
            {s.n > 1 && <span aria-hidden className={`max-[760px]:hidden w-14 h-0.5 mr-1.5 ${s.n <= current ? "bg-gray-900" : "bg-[#C9C9C9]"}`} />}
            {s.href ? (
              <Link href={s.href} className="group flex items-center gap-3 text-gray-900 no-underline hover:text-gray-900">
                {box}
                <span className="flex flex-col [&_strong]:group-hover:underline">{text.props.children}</span>
              </Link>
            ) : (
              <>{box}{text}</>
            )}
          </li>
        );
      })}
    </ol>
  );
}
