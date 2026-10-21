import type { Check, PageExtract } from "./types";

/**
 * Demoläge (AUDIT_DEMO=1): verktyget körs utan databas. Körningarna hålls i
 * minnet och leads sparas inte. Tänkt för lokala visningar innan migrationen
 * är körd — aldrig för produktion, eftersom minnet inte delas mellan
 * serverlösa instanser.
 */
export const isDemo = () => process.env.AUDIT_DEMO === "1";

interface DemoRun {
  finalUrl: string;
  checks: Check[];
  extract: PageExtract;
}

// globalThis överlever att dev-servern laddar om modulen.
const store = ((globalThis as { __auditDemo?: Map<string, DemoRun> }).__auditDemo ??= new Map());

export const saveDemoRun = (id: string, run: DemoRun) => store.set(id, run);
export const getDemoRun = (id: string) => store.get(id);
