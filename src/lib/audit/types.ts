export type CheckGroup = "seo" | "geo";
export type CheckStatus = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  group: CheckGroup;
  label: string;
  status: CheckStatus;
  weight: number;
  /** Vad vi hittade, visas för besökaren. */
  detail: string;
  /** Förslag på åtgärd. Visas inte för besökaren men sparas på körningen. */
  fix: string;
}

/** En granskad sida, som den listas för besökaren. */
export interface AuditedPage {
  url: string;
  title: string;
  status: number;
  /** Antal sidkontroller som inte är godkända. */
  issues: number;
}

/** Det besökaren får se — utan fix-texter och vikter. */
export interface PublicAuditResult {
  id: string;
  url: string;
  host: string;
  score: number;
  seoScore: number;
  geoScore: number;
  checks: Omit<Check, "fix" | "weight">[];
  pages: AuditedPage[];
}
