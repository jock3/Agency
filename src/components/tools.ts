import { ChartGantt, ListChecks, Megaphone, SearchCheck, Smartphone, type LucideIcon } from "lucide-react";

export interface ToolLink {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Verktygen i appen. Menyn och hubben läser båda härifrån. */
export const TOOLS: ToolLink[] = [
  { href: "/mediaplan", label: "Mediaplaner", Icon: ChartGantt },
  { href: "/kampanj", label: "Kampanjer", Icon: Megaphone },
  { href: "/formatkoll", label: "Formatkoll", Icon: Smartphone },
  { href: "/audit", label: "SEO/GEO-audit", Icon: SearchCheck },
  { href: "/todo", label: "Uppgifter", Icon: ListChecks },
];

export const toolByHref = (href: string) => TOOLS.find((t) => t.href === href)!;
