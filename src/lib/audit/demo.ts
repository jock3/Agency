/**
 * Demoläge (AUDIT_DEMO=1): verktyget körs utan databas. Körningarna sparas
 * inte, så ingen cache och ingen hastighetsbegränsning. Tänkt för lokala
 * visningar — aldrig för produktion.
 */
export const isDemo = () => process.env.AUDIT_DEMO === "1";
