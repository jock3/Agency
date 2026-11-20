import { describe, expect, it, vi, beforeEach } from "vitest";

// Kontrollerar verktygsspärren utan databas: admin-listan, DB-raden och proxyns sökvägsmappning.
const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { toolsFor } from "./server";
import { ADMIN_ONLY, GRANTABLE_TOOLS, TOOL_KEYS, parseHiddenTools, toolForPath } from "./tools";

const member = { user_id: "u1", is_admin: false };
const admin = { user_id: "a1", is_admin: true };

beforeEach(() => maybeSingle.mockReset());

describe("Kanban är bara för admin", () => {
  it("kanban ingår inte i det som kan ges till vanliga användare", () => {
    expect(ADMIN_ONLY).toContain("kanban");
    expect(GRANTABLE_TOOLS).not.toContain("kanban");
  });

  it("admin får alla verktyg, Kanban inräknat", async () => {
    expect(await toolsFor(admin)).toEqual([...TOOL_KEYS]);
  });

  it("vanlig användare utan rad får alla verktyg utom Kanban", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const tools = await toolsFor(member);
    expect(tools).toContain("todo");
    expect(tools).not.toContain("kanban");
  });

  it("gammal databasrad med kanban ger ändå ingen Kanban", async () => {
    maybeSingle.mockResolvedValue({ data: { tools: ["kanban", "todo"] }, error: null });
    expect(await toolsFor(member)).toEqual(["todo"]);
  });

  it("proxyn skyddar /kanban och API:t, men inte startsidan", () => {
    expect(toolForPath("/kanban")).toBe("kanban");
    expect(toolForPath("/api/kanban")).toBe("kanban");
    expect(toolForPath("/")).toBeNull();
  });
});

describe("verktygsväljarens kaka", () => {
  it("tål skräp och tomma värden", () => {
    expect(parseHiddenTools(undefined)).toEqual([]);
    expect(parseHiddenTools("")).toEqual([]);
    expect(parseHiddenTools("formatkoll,hacka,todo")).toEqual(["formatkoll", "todo"]);
  });

  it("ignorerar trasig procentkodning i stället för att kasta", () => {
    expect(parseHiddenTools("%E0%A4%A")).toEqual([]);
  });
});
