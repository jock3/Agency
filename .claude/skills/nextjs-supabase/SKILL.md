---
name: nextjs-supabase
description: |
  Patterns and conventions for building Next.js 14 App Router apps with Supabase in the Agency monorepo.
  Covers auth, dark theme, Tailwind config, Supabase client, API layer, and Vercel deployment.
  Use whenever creating or modifying apps under apps/todo or apps/mediaplan.
---

# Next.js + Supabase App Patterns (Agency Monorepo)

Canonical patterns extracted from `apps/todo` and `apps/mediaplan`. Follow these exactly to stay consistent across the monorepo.

---

## Project Layout

```
apps/<name>/
├── src/
│   ├── app/
│   │   ├── layout.tsx          root layout — Komet font, dark bg
│   │   ├── globals.css         @tailwind + dark theme vars + scrollbar
│   │   ├── page.tsx            "use client" main shell
│   │   ├── login/page.tsx      login form (dark theme)
│   │   └── api/auth/
│   │       ├── login/route.ts  POST → sets cookie
│   │       └── logout/route.ts GET  → clears cookie
│   ├── middleware.ts            cookie auth guard
│   ├── lib/
│   │   ├── supabase/client.ts  singleton pattern
│   │   ├── types.ts            all TypeScript interfaces
│   │   └── api/                one file per table
│   └── components/             UI components
├── package.json                port 3001 or 3002
├── next.config.mjs
├── tailwind.config.ts
└── vercel.json                 { "framework": "nextjs" }
```

**Ports**: mediaplan = 3001, todo = 3002. Pick the next available.

---

## Supabase Client (Singleton)

```typescript
// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
```

**Never** create the client inline in components — always use this singleton.

---

## Auth Pattern

Cookie-based HMAC auth — no Supabase Auth, no OAuth. One password for the whole app.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const SECRET = process.env.ADMIN_COOKIE_SECRET!;
const COOKIE = "admin_token";

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const expected = sign(process.env.ADMIN_PASSWORD!);
  if (token !== expected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|login|_next|favicon).*)"] };
```

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = form.get("password") as string;
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }
  const token = createHmac("sha256", process.env.ADMIN_COOKIE_SECRET!)
    .update(password).digest("hex");
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("admin_token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
```

Required env vars: `ADMIN_PASSWORD`, `ADMIN_COOKIE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Dark Theme

### globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Komet';
  src: url('/fonts/komet/KometTrial-Regular.otf') format('opentype');
  font-weight: 400;
}

body {
  background-color: #141414;
  color: #e5e5e5;
  font-family: 'Komet', system-ui, sans-serif;
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}
```

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `#141414` | main bg | page, main pane |
| `#1a1a1a` | panel bg | sidebar, detail panel |
| `#1c1c1c` | card bg | group headers, hover rows |
| `#181818` | header bg | column headers, footers |
| `#252525` | input bg | all inputs, textareas, selects |
| `#2d2d2d` | border | input borders, dividers |
| `#3d3d3d` | hover border | interactive borders |
| `#e5e5e5` | primary text | headings |
| `#d4d4d4` | body text | task titles |
| `#888` | muted text | placeholders, labels |
| `#555` | dim text | section headers (uppercase) |
| `#444` | faint text | disabled, icons |

### Tailwind Config (Milou palette)

```typescript
// tailwind.config.ts
extend: {
  colors: {
    milou: {
      400: "#ff6b8a",
      500: "#E60330",  // primary brand red
      600: "#c0021f",
    }
  },
  fontFamily: {
    sans: ['Komet', 'system-ui', 'sans-serif'],
  }
}
```

---

## API Layer Pattern

One file per Supabase table. Never query Supabase directly in components.

```typescript
// lib/api/tasks.ts — canonical pattern
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TodoTask } from "@/lib/types";

export async function getAllTasks(): Promise<TodoTask[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from("todo_tasks").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createTask(task: Pick<TodoTask, "title" | "list_id" | "priority" | "due_date">): Promise<TodoTask> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from("todo_tasks").insert(task).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<TodoTask>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_tasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_tasks").delete().eq("id", id);
  if (error) throw error;
}
```

**Key rules:**
- Always destructure `{ data, error }` — never ignore error
- Use `.single()` when inserting and expecting one row back
- Return `data ?? []` for list queries (never `data!`)

---

## TypeScript Types Pattern

```typescript
// lib/types.ts — all interfaces in one file
export interface TodoList {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export type TodoStatus = "ej_paborjad" | "pagar" | "klar" | "avbruten";

export interface TodoTask {
  id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  completed: boolean;
  status: TodoStatus;
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;       // ISO date string "YYYY-MM-DD"
  sort_order: number;
  completed_at: string | null;   // ISO datetime
  created_at: string;
}
```

**Status + completed sync**: When updating `status`, always also set `completed` and `completed_at` atomically:

```typescript
function statusMeta(status: TodoStatus) {
  return {
    completed: status === "klar",
    completed_at: status === "klar" ? new Date().toISOString() : null,
  };
}
// In updateTask: spread statusMeta AFTER updates so it overrides:
sb.from("todo_tasks").update({ ...updates, ...statusMeta(updates.status) })
// ⚠️ Never spread statusMeta AND also pass `completed` explicitly — duplicate key = TS error
```

---

## Supabase Database Conventions

- Use `uuid` PKs with `gen_random_uuid()` default
- Include `created_at timestamptz DEFAULT now()` on every table
- Use `sort_order int NOT NULL DEFAULT 0` for user-orderable tables
- Add `CHECK` constraints for enum-like text columns
- RLS is **off** — the app uses cookie auth instead

Example migration:

```sql
CREATE TABLE todo_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES todo_lists(id) ON DELETE SET NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ej_paborjad'
    CHECK (status IN ('ej_paborjad', 'pagar', 'klar', 'avbruten')),
  priority text NOT NULL DEFAULT 'none'
    CHECK (priority IN ('none', 'low', 'medium', 'high')),
  due_date date,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## Vercel Deployment (Monorepo)

Each app needs its own Vercel project pointed at its subdirectory.

```json
// apps/<name>/vercel.json
{ "framework": "nextjs" }
```

In the Vercel dashboard: set **Root Directory** to `apps/<name>`.
Vercel reads the root directory setting from the **default branch** (`main`), so new apps must be on `main` before the Vercel project can be configured.

**Required env vars in Vercel**:
- `ADMIN_PASSWORD`
- `ADMIN_COOKIE_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Common Pitfalls

| Mistake | Fix |
|---------|-----|
| Duplicate object key in spread (e.g. `{ completed, ...statusMeta() }`) | Remove the explicit key — let statusMeta be the sole source |
| `npm run build` not run before push | Pre-push hook in `.claude/helpers/pre-push-build.sh` catches this |
| Vercel can't find app in directory picker | App must exist on `main`, not just the deployment branch |
| Date input invisible on dark bg | Add `[color-scheme:dark]` class to `<input type="date">` |
| Supabase client created per-request | Always use `getSupabaseClient()` singleton |

---

## Build Verification

Always run before pushing:

```bash
cd apps/todo && npm run build
cd apps/mediaplan && npm run build
```

The pre-push hook at `.claude/helpers/pre-push-build.sh` does this automatically and blocks the push on failure.
