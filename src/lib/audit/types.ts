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
  /** Reservåtgärd om Claude inte svarar. Visas aldrig innan upplåsning. */
  fix: string;
}

/** Det Claude får se av sidan. Sparas på körningen. */
export interface PageExtract {
  title: string;
  description: string;
  headings: string[];
  text: string;
  schemaTypes: string[];
}

export interface AuditAction {
  title: string;
  description: string;
  impact: "hög" | "medel" | "låg";
}

/** Svaret före upplåsning — utan fix-texter, utdrag eller åtgärder. */
export interface PublicAuditResult {
  id: string;
  url: string;
  host: string;
  score: number;
  seoScore: number;
  geoScore: number;
  checks: Omit<Check, "fix" | "weight">[];
}

export interface UnlockedAudit {
  summary: string;
  actions: AuditAction[];
}
