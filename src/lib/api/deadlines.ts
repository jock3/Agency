"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { MediaDeadline } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "name",
  "date",
  "color",
] as const;

export async function createDeadline(planId: string, date: string): Promise<MediaDeadline> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("media_deadlines")
    .insert({ plan_id: planId, name: "Materialdeadline", date, color: "#ef4444" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDeadline(id: string, updates: Partial<MediaDeadline>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_deadlines").update(pick<MediaDeadline>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteDeadline(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("media_deadlines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
