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
  /** Andel godkända sidor (0–1) för sammanvägda sidkontroller. Saknas den
   *  räknas poängen från status. */
  ratio?: number;
}

/** En granskad sida, som den listas för besökaren. */
export interface AuditedPage {
  url: string;
  title: string;
  status: number;
  /** Antal sidkontroller som inte är godkända. */
  issues: number;
}

/** Kortversion av en undersida för Claude. */
export interface SubpageExtract {
  url: string;
  title: string;
  h1: string;
  issues: string[];
  text: string;
}

/** Det Claude får se av sidan. Sparas på körningen. */
export interface PageExtract {
  title: string;
  description: string;
  headings: string[];
  text: string;
  schemaTypes: string[];
  /** Övriga granskade sidor. Saknas på körningar från före flersidesgranskningen. */
  pages?: SubpageExtract[];
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
  checks: Omit<Check, "fix" | "weight" | "ratio">[];
  pages: AuditedPage[];
}

export interface UnlockedAudit {
  summary: string;
  actions: AuditAction[];
}
