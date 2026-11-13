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

/** Lägger till en plattforms- eller kanalrad i ett anrop: hittar eller skapar
 *  planens kategori för sektionen och skapar raden med namn, färg och enhet. */
export async function addChannelLine(
  planId: string,
  section: "social" | "extern",
  channel: { name: string; color: string; unit?: string },
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const sb = await authedDb();
  const { data: cats, error: catErr } = await sb
    .from("media_categories")
    .select("id, sort_order")
    .eq("plan_id", planId)
    .order("sort_order");
  if (catErr) throw new Error(catErr.message);
  const { data: sectionCat } = await sb
    .from("media_categories")
    .select("id")
    .eq("plan_id", planId)
    .eq("section", section)
    .limit(1)
    .maybeSingle();

  let categoryId = sectionCat?.id as string | undefined;
  if (!categoryId) {
    const { data: created, error } = await sb
      .from("media_categories")
      .insert({
        plan_id: planId,
        name: section === "social" ? "Sociala medier" : "Extern media",
        color: "#E60330",
        sort_order: cats?.length ?? 0,
        section,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    categoryId = created.id as string;
  }

  const { count } = await sb
    .from("media_lines")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { error } = await sb.from("media_lines").insert({
    category_id: categoryId,
    platform_name: channel.name,
    cost_per_unit: 0,
    unit_type: channel.unit ?? "per månad",
    quantity: 1,
    color: channel.color,
    start_date: periodStart,
    end_date: periodEnd,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
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
