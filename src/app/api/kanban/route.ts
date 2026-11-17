import { NextRequest, NextResponse } from "next/server";
import { isStatus } from "@/lib/kanban/cards";
import { listCards, moveCard } from "@/lib/kanban/vault";

export async function GET() {
  try {
    return NextResponse.json({ cards: await listCards() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  if (typeof id !== "string" || !isStatus(status)) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  try {
    await moveCard(id, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
