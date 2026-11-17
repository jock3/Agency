import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

export interface HeroStat { label: string; value: React.ReactNode; suffix?: string }

/**
 * Den mörka delen under toppmenyn: brödsmulor, rubrik med beskrivning, primärknapp,
 * nyckeltal och flikarna Mediaplaner/Rapport. Den aktiva fliken har sidans bakgrund,
 * så den ser ut att gå över i sidan.
 */
export default function Hero({ crumbs, lead, eyebrow, title, titleSize = 68, subtitle, action, stats }: {
  crumbs?: { label: string; href?: string }[];
  lead?: React.ReactNode;
  eyebrow?: string;
  title: string;
  titleSize?: 64 | 68;
  subtitle?: React.ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  stats?: HeroStat[];
}) {
  const cols = stats?.length === 4 ? "min-[761px]:grid-cols-4" : "min-[761px]:grid-cols-3";
  return (
    <section aria-labelledby="mp-title" className="bg-gray-900 text-white border-t border-gray-800">
      <div className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-9 min-[761px]:pt-14">
        {crumbs && (
          <nav aria-label="Brödsmulor" className="mb-7">
            <ol className="list-none m-0 p-0 flex flex-wrap items-center gap-2.5 text-sm font-semibold">
              <li><Link href="/mediaplan" className="text-[#BDBDBD] no-underline hover:text-white">Kunder</Link></li>
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <ChevronRight aria-hidden className="w-3.5 h-3.5 text-gray-600" />
                  {c.href ? <Link href={c.href} className="text-[#BDBDBD] no-underline hover:text-white">{c.label}</Link> : <span aria-current="page" className="text-white">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex flex-wrap justify-between items-end gap-6">
          <div className="flex items-center gap-[22px] min-w-0">
            {lead}
            <div className="min-w-0">
              {eyebrow && <p className="m-0 text-[13px] font-bold tracking-[0.1em] uppercase text-[#FF999C]">{eyebrow}</p>}
              <h1 id="mp-title" className={`m-0 font-display font-extrabold leading-none tracking-[-0.025em] text-[44px] ${titleSize === 64 ? "min-[761px]:text-[64px]" : "min-[761px]:text-[68px]"} ${eyebrow ? "mt-1.5" : ""}`}>{title}</h1>
              {subtitle && <p className="mt-3 mb-0 text-base min-[761px]:text-lg leading-[1.55] text-[#D4D4D4] max-w-[640px]">{subtitle}</p>}
            </div>
          </div>
          {action && (
            <button type="button" onClick={action.onClick} disabled={action.disabled} className="inline-flex items-center gap-2.5 min-h-[52px] px-6 border-0 bg-[#E60330] hover:bg-[#C8022A] disabled:opacity-60 text-white text-base font-extrabold cursor-pointer">
              <Plus aria-hidden className="w-4 h-4" strokeWidth={2.4} />{action.label}
            </button>
          )}
        </div>
        {stats && (
          <dl className={`grid grid-cols-2 ${cols} m-0 mt-10 min-[761px]:mt-12 border-t border-[#3A3A3A]`}>
            {stats.map((s, i) => (
              <div key={s.label} className={`pt-[22px] pb-[26px] min-[761px]:pr-6 ${i > 0 ? "min-[761px]:pl-6 min-[761px]:border-l min-[761px]:border-[#3A3A3A]" : ""}`}>
                <dt className="text-[13px] font-semibold text-[#BDBDBD]">{s.label}</dt>
                <dd className="m-0 mt-1.5 text-[26px] min-[761px]:text-4xl font-extrabold leading-[1.1] tracking-[-0.01em] flex items-center gap-3 whitespace-nowrap">
                  {s.value}{s.suffix && <span className="text-xl font-semibold text-[#BDBDBD]">{s.suffix}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <nav aria-label="Vy" className={`flex gap-0.5 ${stats ? "mt-3" : "mt-10"}`}>
          <Link href="/mediaplan" aria-current="page" className="inline-flex items-center px-[22px] py-3.5 text-[15px] font-extrabold no-underline bg-gray-50 text-gray-900">Mediaplaner</Link>
          <Link href="/mediaplan/rapport" className="inline-flex items-center px-[22px] py-3.5 text-[15px] font-semibold no-underline text-white hover:bg-gray-800 hover:text-white">Rapport</Link>
        </nav>
      </div>
    </section>
  );
}
