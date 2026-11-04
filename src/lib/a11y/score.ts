import { cleanContrast, type Contrast } from "./contrast";
import { criteriaOf, levelOf } from "./wcag";

/**
 * Sammanvägning av axe-resultaten per sida till en lista över brister för
 * hela sajten, plus ett betyg 1–10. Allt här är deterministiskt: samma
 * resultat från webbläsaren ger samma betyg.
 */

export type Impact = "critical" | "serious" | "moderate" | "minor";
export type Priority = "critical" | "high" | "medium" | "nice";

/** En regel som inte klarades på en sida, så som den kommer från webbläsaren. */
export interface RawViolation {
  id: string;
  impact: Impact | null;
  tags: string[];
  help: string;
  description: string;
  helpUrl: string;
  /** Antal element som bryter mot regeln. */
  count: number;
  examples: { target: string; html: string; summary: string; contrast?: Contrast }[];
}

export interface PageScan {
  url: string;
  title: string;
  status: number;
  violations: RawViolation[];
  /** Regler där axe inte kunde avgöra själv. */
  incomplete: { id: string; help: string; count: number }[];
  passes: number;
}

export interface Finding {
  id: string;
  impact: Impact;
  priority: Priority;
  title: string;
  description: string;
  helpUrl: string;
  criteria: string[];
  level: "A" | "AA";
  /** Antal element totalt, över alla sidor. */
  count: number;
  pages: { url: string; count: number }[];
  examples: { url: string; target: string; html: string; summary: string; contrast?: Contrast }[];
}

export interface ManualCheck {
  id: string;
  title: string;
  pages: number;
  count: number;
}

export interface PageSummary {
  url: string;
  title: string;
  status: number;
  score: number;
  /** Antal regler som inte klaras på sidan. */
  issues: number;
  /** Antal element med brister. */
  elements: number;
}

/** Hur mycket en regel drar av betyget, efter axe:s bedömning av allvaret. */
const WEIGHT: Record<Impact, number> = { critical: 3, serious: 2, moderate: 1, minor: 0.5 };

const PRIORITY: Record<Impact, Priority> = { critical: "critical", serious: "high", moderate: "medium", minor: "nice" };

const RANK: Record<Impact, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

const IMPACTS = new Set<string>(["critical", "serious", "moderate", "minor"]);
const impactOf = (v: RawViolation): Impact => (v.impact && IMPACTS.has(v.impact) ? v.impact : "moderate");

/** Resultatet kommer ur den granskade sidan, vars skript i teorin kan skriva
 *  över axe. Länken visas i appen, så bara axe:s egen dokumentation släpps
 *  igenom (aldrig javascript: eller andra värdar). */
const safeHelpUrl = (u: string) => (/^https:\/\/dequeuniversity\.com\//.test(u) ? u : "");

/**
 * 10 bara när ingen regel bryts, som i SEO-auditen: grönt ska betyda inga
 * fynd. Varje regel drar av sin vikt, halva vikten oavsett spridning och
 * resten efter hur stor andel av sidorna som har felet. Vikterna är satta
 * för hand och inte kalibrerade mot manuella granskningar.
 */
export function scoreOf(rules: { impact: Impact; share: number }[]): number {
  if (rules.length === 0) return 10;
  const penalty = rules.reduce((sum, r) => sum + WEIGHT[r.impact] * (0.5 + 0.5 * r.share), 0);
  return Math.min(9, Math.max(1, Math.round(10 - penalty)));
}

const MAX_EXAMPLES = 5;

export function aggregate(pages: PageScan[]): {
  score: number;
  findings: Finding[];
  manual: ManualCheck[];
  pages: PageSummary[];
  passes: number;
} {
  const byRule = new Map<string, Finding>();
  for (const page of pages) {
    for (const v of page.violations) {
      const impact = impactOf(v);
      let f = byRule.get(v.id);
      if (!f) {
        const criteria = criteriaOf(Array.isArray(v.tags) ? v.tags : []);
        f = {
          id: v.id,
          impact,
          priority: PRIORITY[impact],
          title: v.help,
          description: v.description,
          helpUrl: safeHelpUrl(String(v.helpUrl ?? "")),
          criteria,
          level: levelOf(criteria, Array.isArray(v.tags) ? v.tags : []),
          count: 0,
          pages: [],
          examples: [],
        };
        byRule.set(v.id, f);
      }
      // Samma regel kan ha olika allvar på olika sidor. Det värsta gäller.
      if (RANK[impact] < RANK[f.impact]) {
        f.impact = impact;
        f.priority = PRIORITY[impact];
      }
      f.count += v.count;
      f.pages.push({ url: page.url, count: v.count });
      for (const e of v.examples) if (f.examples.length < MAX_EXAMPLES) f.examples.push({ url: page.url, ...e, contrast: cleanContrast(e.contrast) });
    }
  }

  const findings = [...byRule.values()].sort((a, b) => RANK[a.impact] - RANK[b.impact] || b.pages.length - a.pages.length || b.count - a.count);
  const score = scoreOf(findings.map((f) => ({ impact: f.impact, share: f.pages.length / pages.length })));

  const manualMap = new Map<string, ManualCheck>();
  for (const page of pages) {
    for (const i of page.incomplete) {
      const m = manualMap.get(i.id) ?? { id: i.id, title: i.help, pages: 0, count: 0 };
      m.pages++;
      m.count += i.count;
      manualMap.set(i.id, m);
    }
  }
  const manual = [...manualMap.values()].sort((a, b) => b.pages - a.pages || b.count - a.count);

  return {
    score,
    findings,
    manual,
    pages: pages.map((p) => ({
      url: p.url,
      title: p.title,
      status: p.status,
      score: scoreOf(p.violations.map((v) => ({ impact: impactOf(v), share: 1 }))),
      issues: p.violations.length,
      elements: p.violations.reduce((n, v) => n + v.count, 0),
    })),
    // Godkända regler på startsidan, som ett mått på hur mycket som prövades.
    passes: pages[0]?.passes ?? 0,
  };
}
