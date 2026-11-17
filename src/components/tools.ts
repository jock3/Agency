import { Accessibility, ChartGantt, ListChecks, Megaphone, SquareKanban, SearchCheck, Share2, Smartphone, type LucideIcon } from "lucide-react";

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
  { href: "/social", label: "Social media", Icon: Share2 },
  { href: "/audit", label: "SEO/GEO-audit", Icon: SearchCheck },
  { href: "/tillganglighet", label: "Tillgänglighet", Icon: Accessibility },
  { href: "/todo", label: "Uppgifter", Icon: ListChecks },
  { href: "/kanban", label: "Kanban", Icon: SquareKanban },
];

export const toolByHref = (href: string) => TOOLS.find((t) => t.href === href)!;
