"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { MediaCategory } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "name",
  "budget",
  "color",
  "sort_order",
] as const;

const CATEGORY_COLORS = [
  "#E60330", "#f59e0b", "#10b981", "#931644", "#5B173C",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createCategory(planId: string, name: string, sortOrder = 0): Promise<MediaCategory> {
  const sb = await authedDb();
  const color = CATEGORY_COLORS[sortOrder % CATEGORY_COLORS.length];
  const { data, error } = await sb
    .from("media_categories")
    .insert({ plan_id: planId, name, color, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(id: string, updates: Partial<MediaCategory>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_categories").update(pick<MediaCategory>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
