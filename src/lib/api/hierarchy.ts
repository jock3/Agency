"use server";

import { authedDb } from "@/lib/api/server";
import type { MediaPlan, MplanClient, MplanProject } from "@/lib/types";
import { hierarchyTags, mergeTags, renameTag, rollup, type Rollup } from "@/lib/mediaplan/hierarchy";

/**
 * Mediaplan i tre steg: kund → projekt → årsplaner och kampanjer.
 * Samma åtkomst som planerna: alla inloggade (authedDb).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_COLS = "id, campaign_name, period_start, period_end, archived, share_token, client_id, planned_budget, status, tags, project_id, kind, plan_year, created_at, updated_at";

function name(v: unknown, max = 120): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s.length > max) throw new Error("INVALID_NAME");
  return s;
}
function uuid(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("NOT_FOUND");
  return v;
}
function dup(error: { code?: string; message: string } | null) {
  if (error?.code === "23505") throw new Error("DUPLICATE");
  if (error) throw new Error(error.message);
}

export interface ClientSummary extends MplanClient {
  projects: number;
  rollup: Rollup;
  /** Plats i skapandeordningen (0 = äldst). Ger kundens färg. */
  rank: number;
}
export interface ProjectSummary extends MplanProject { rollup: Rollup; years: number[] }

/** Kundernas plats i skapandeordningen, för färgen. */
async function clientRanks(): Promise<Map<string, number>> {
  const sb = await authedDb();
  const { data } = await sb.from("mplan_clients").select("id, created_at").order("created_at").order("id");
  return new Map((data ?? []).map((c, i) => [c.id as string, i]));
}

/** Steg 1: alla kunder med antal projekt och summering av deras planer, plus antal osorterade planer. */
export async function listClients(): Promise<{ clients: ClientSummary[]; unsorted: number }> {
  const sb = await authedDb();
  const [c, p, plans] = await Promise.all([
    sb.from("mplan_clients").select("*").order("name"),
    sb.from("mplan_projects").select("id, client_id, archived"),
    sb.from("media_plans").select("project_id, kind, plan_year, period_start, period_end, planned_budget, archived"),
  ]);
  if (c.error) throw new Error(c.error.message);
  const projects = p.data ?? [];
  const all = (plans.data ?? []) as (Pick<MediaPlan, "project_id" | "kind" | "plan_year" | "period_start" | "period_end" | "planned_budget" | "archived">)[];
  const ranks = await clientRanks();
  const clients = (c.data ?? []).map((cl) => {
    const ids = new Set(projects.filter((x) => x.client_id === cl.id).map((x) => x.id));
    return {
      ...(cl as MplanClient),
      rank: ranks.get(cl.id as string) ?? 0,
      projects: projects.filter((x) => x.client_id === cl.id && !x.archived).length,
      rollup: rollup(all.filter((pl) => pl.project_id && ids.has(pl.project_id))),
    };
  });
  return { clients, unsorted: all.filter((pl) => !pl.project_id && !pl.archived).length };
}

export async function createClient(input: { name: string; clientNumber?: string }): Promise<MplanClient> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("mplan_clients")
    .insert({ name: name(input.name), client_number: (input.clientNumber ?? "").trim().slice(0, 40) })
    .select()
    .single();
  dup(error);
  return data as MplanClient;
}

/** Ändrar kund. Byts namnet följer taggen med på kundens planer och deras rapporter. */
export async function updateClient(id: string, input: { name?: string; clientNumber?: string; archived?: boolean }): Promise<void> {
  const sb = await authedDb();
  uuid(id);
  const { data: before } = await sb.from("mplan_clients").select("name").eq("id", id).single();
  if (!before) throw new Error("NOT_FOUND");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = name(input.name);
  if (input.clientNumber !== undefined) patch.client_number = input.clientNumber.trim().slice(0, 40);
  if (input.archived !== undefined) patch.archived = !!input.archived;
  const { error } = await sb.from("mplan_clients").update(patch).eq("id", id);
  dup(error);
  if (patch.name && patch.name !== before.name) {
    const { data: projects } = await sb.from("mplan_projects").select("id").eq("client_id", id);
    await retag((projects ?? []).map((p) => p.id), before.name, patch.name as string);
  }
}

/** Tar bort kunden och dess projekt. Planerna finns kvar under Osorterade. */
export async function deleteClient(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("mplan_clients").delete().eq("id", uuid(id));
  if (error) throw new Error(error.message);
}

/** Steg 2: kunden och dess projekt med summering per projekt. */
export async function getClient(id: string): Promise<{ client: MplanClient; rank: number; projects: ProjectSummary[] } | null> {
  const sb = await authedDb();
  if (!UUID.test(id)) return null;
  const [c, p] = await Promise.all([
    sb.from("mplan_clients").select("*").eq("id", id).maybeSingle(),
    sb.from("mplan_projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c.data) return null;
  const projects = (p.data ?? []) as MplanProject[];
  const { data: plans } = projects.length
    ? await sb.from("media_plans").select("project_id, kind, plan_year, period_start, period_end, planned_budget, archived").in("project_id", projects.map((x) => x.id))
    : { data: [] };
  const list = (plans ?? []) as MediaPlan[];
  const ranks = await clientRanks();
  return {
    client: c.data as MplanClient,
    rank: ranks.get(id) ?? 0,
    projects: projects.map((pr) => {
      const mine = list.filter((pl) => pl.project_id === pr.id);
      const years = [...new Set(mine.filter((pl) => pl.kind === "year" && pl.plan_year).map((pl) => pl.plan_year as number))].sort();
      return { ...pr, rollup: rollup(mine), years };
    }),
  };
}

export async function createProject(clientId: string, projectName: string): Promise<MplanProject> {
  const sb = await authedDb();
  const { data, error } = await sb.from("mplan_projects").insert({ client_id: uuid(clientId), name: name(projectName) }).select().single();
  dup(error);
  return data as MplanProject;
}

/** Ändrar projekt. Byts namnet följer taggen med på projektets planer och deras rapporter. */
export async function updateProject(id: string, input: { name?: string; archived?: boolean }): Promise<void> {
  const sb = await authedDb();
  uuid(id);
  const { data: before } = await sb.from("mplan_projects").select("name").eq("id", id).single();
  if (!before) throw new Error("NOT_FOUND");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = name(input.name);
  if (input.archived !== undefined) patch.archived = !!input.archived;
  const { error } = await sb.from("mplan_projects").update(patch).eq("id", id);
  dup(error);
  if (patch.name && patch.name !== before.name) await retag([id], before.name, patch.name as string);
}

/** "Blanda mönster": nästa mönster för projektet. Returnerar det nya värdet. */
export async function shufflePattern(id: string): Promise<number> {
  const sb = await authedDb();
  const { data: before } = await sb.from("mplan_projects").select("pattern_round").eq("id", uuid(id)).single();
  if (!before) throw new Error("NOT_FOUND");
  const next = ((before.pattern_round as number) + 1) % 1000000;
  const { error } = await sb.from("mplan_projects").update({ pattern_round: next }).eq("id", id);
  if (error) throw new Error(error.message);
  return next;
}

/** Tar bort projektet. Planerna finns kvar under Osorterade. */
export async function deleteProject(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("mplan_projects").delete().eq("id", uuid(id));
  if (error) throw new Error(error.message);
}

/** Steg 3: projektet, dess kund och alla planer (årsplaner och kampanjer). */
export async function getProject(id: string): Promise<{ client: MplanClient; project: MplanProject; plans: MediaPlan[] } | null> {
  const sb = await authedDb();
  if (!UUID.test(id)) return null;
  const { data: project } = await sb.from("mplan_projects").select("*").eq("id", id).maybeSingle();
  if (!project) return null;
  const [c, plans] = await Promise.all([
    sb.from("mplan_clients").select("*").eq("id", project.client_id).single(),
    sb.from("media_plans").select(PLAN_COLS).eq("project_id", id).order("period_start"),
  ]);
  if (!c.data) return null;
  return { client: c.data as MplanClient, project: project as MplanProject, plans: (plans.data ?? []) as MediaPlan[] };
}

async function projectNames(projectId: string) {
  const sb = await authedDb();
  const { data: project } = await sb.from("mplan_projects").select("id, name, client_id").eq("id", uuid(projectId)).maybeSingle();
  if (!project) throw new Error("NOT_FOUND");
  const { data: client } = await sb.from("mplan_clients").select("name").eq("id", project.client_id).single();
  return { project: project.name as string, client: (client?.name as string) ?? "" };
}

/**
 * Ny plan i ett projekt. Årsplanen gäller hela året; en kampanj har egen period.
 * Taggar sätts automatiskt: kund, projekt och kampanjens namn.
 */
export async function createProjectPlan(projectId: string, input: { kind: "year" | "campaign"; year?: number; name?: string; start?: string; end?: string }): Promise<MediaPlan> {
  const sb = await authedDb();
  const names = await projectNames(projectId);
  const date = /^\d{4}-\d{2}-\d{2}$/;
  let row: Record<string, unknown>;
  if (input.kind === "year") {
    const y = Number(input.year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("INVALID_YEAR");
    row = { campaign_name: `${names.project} ${y}`, period_start: `${y}-01-01`, period_end: `${y}-12-31`, kind: "year", plan_year: y, tags: hierarchyTags(names.client, names.project) };
  } else {
    const n = name(input.name, 160);
    if (!date.test(input.start ?? "") || !date.test(input.end ?? "") || (input.start as string) > (input.end as string)) throw new Error("INVALID_PERIOD");
    row = { campaign_name: n, period_start: input.start, period_end: input.end, kind: "campaign", plan_year: null, tags: hierarchyTags(names.client, names.project, n) };
  }
  const { data, error } = await sb.from("media_plans").insert({ ...row, project_id: projectId }).select(PLAN_COLS).single();
  dup(error);
  return data as MediaPlan;
}

/** Osorterade planer (utan projekt). */
export async function listUnsortedPlans(): Promise<MediaPlan[]> {
  const sb = await authedDb();
  const { data, error } = await sb.from("media_plans").select(PLAN_COLS).is("project_id", null).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaPlan[];
}

/** Flyttar en plan till ett projekt som årsplan eller kampanj, och lägger till kund- och projekttaggar. */
export async function movePlan(planId: string, projectId: string, kind: "year" | "campaign"): Promise<void> {
  const sb = await authedDb();
  const names = await projectNames(projectId);
  const { data: plan } = await sb.from("media_plans").select("campaign_name, period_start, tags").eq("id", uuid(planId)).single();
  if (!plan) throw new Error("NOT_FOUND");
  const year = Number(String(plan.period_start).slice(0, 4));
  const tags = mergeTags(plan.tags as string[], hierarchyTags(names.client, names.project, kind === "campaign" ? (plan.campaign_name as string) : undefined));
  const { error } = await sb
    .from("media_plans")
    .update({ project_id: projectId, kind, plan_year: kind === "year" ? year : null, tags })
    .eq("id", planId);
  dup(error);
}

/** Namnbyte: byt taggen på alla planer i projekten och på deras rapporter. */
async function retag(projectIds: string[], from: string, to: string) {
  if (!projectIds.length) return;
  const sb = await authedDb();
  const { data: plans } = await sb.from("media_plans").select("id, tags").in("project_id", projectIds);
  for (const p of plans ?? []) {
    const next = renameTag(p.tags as string[], from, to);
    if (JSON.stringify(next) !== JSON.stringify(p.tags)) await sb.from("media_plans").update({ tags: next }).eq("id", p.id);
  }
  const ids = (plans ?? []).map((p) => p.id);
  if (!ids.length) return;
  const { data: reports } = await sb.from("report_docs").select("id, tags").in("plan_id", ids);
  for (const r of reports ?? []) {
    const next = renameTag(r.tags as string[], from, to);
    if (JSON.stringify(next) !== JSON.stringify(r.tags)) await sb.from("report_docs").update({ tags: next }).eq("id", r.id);
  }
}
