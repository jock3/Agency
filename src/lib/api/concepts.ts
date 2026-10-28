"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { MediaConcept } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "name",
  "start_date",
  "end_date",
  "color",
  "sort_order",
] as const;

const CONCEPT_COLORS = [
  "#E60330", "#f59e0b", "#10b981", "#931644", "#5B173C",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createConcept(
  planId: string,
  periodStart: string,
  periodEnd: string,
  sortOrder: number
): Promise<MediaConcept> {
  const sb = await authedDb();
  const color = CONCEPT_COLORS[sortOrder % CONCEPT_COLORS.length];
  const { data, error } = await sb
    .from("media_concepts")
    .insert({
      plan_id: planId,
      name: "Nytt koncept",
      start_date: periodStart,
      end_date: periodEnd,
      color,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateConcept(id: string, updates: Partial<MediaConcept>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_concepts").update(pick<MediaConcept>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteConcept(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_concepts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
