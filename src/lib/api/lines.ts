"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { MediaLine } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "category_id",
  "platform_name",
  "cost_per_unit",
  "unit_type",
  "quantity",
  "campaign_mapping",
  "color",
  "start_date",
  "end_date",
  "sort_order",
  "deadline_date",
  "deadline_label",
  "estimated_reach",
] as const;

export async function createLine(
  categoryId: string,
  periodStart: string,
  periodEnd: string,
  sortOrder = 0
): Promise<MediaLine> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("media_lines")
    .insert({
      category_id: categoryId,
      platform_name: "Ny rad",
      cost_per_unit: 0,
      unit_type: "per månad",
      quantity: 1,
      color: "#3b82f6",
      start_date: periodStart,
      end_date: periodEnd,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLine(id: string, updates: Partial<MediaLine>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_lines").update(pick<MediaLine>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLine(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_lines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderLines(lines: { id: string; sort_order: number }[]): Promise<void> {
  const sb = await authedDb();
  // One update per row rather than an upsert: an upsert of just id + sort_order
  // is an INSERT first, and the missing NOT NULL columns make it fail.
  const results = await Promise.all(
    lines.map(({ id, sort_order }) => sb.from("media_lines").update({ sort_order }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
