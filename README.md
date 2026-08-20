# Milou Verktyg

Next.js-app med tre verktyg: **Mediaplaner**, **Kampanjer** och **Uppgifter**.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- Supabase (Postgres + RPC-baserad auth)

Middleware ligger i `src/proxy.ts`, inte `middleware.ts`, efter Next 16-namnbytet.

## Utveckling

```bash
npm install
npm run dev     # http://localhost:3001
```

Kräver `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` är obligatorisk och måste vara satt även i Vercel.
Uppgiftstavlan läser och skriver aldrig direkt från webbläsaren — all data går
via `/api/todo/*`, som validerar sessionskakan och sedan använder
service-role-nyckeln. Tabellerna `todo_*` nekar anon-rollen helt, så utan
nyckeln svarar tavlan med fel i stället för att tyst visa en tom tavla.

## Auth

Inloggning sker med namn + 6-siffrig PIN mot Supabase-funktionerna `app_login`
och `app_signup`. PIN-koder lagras bcrypt-hashade; fem felaktiga försök låser
kontot i 15 minuter. Adminfunktioner ligger under `/admin`.

## Uppgiftstavlan

`/todo` är en Monday-liknande tavla: grupper med kolumner (person, status,
prioritet, datum, tidslinje), underobjekt, tabell-/tidslinje-/kalendervy,
automationsregler, arkiv, bulkåtgärder, drag & drop, kommentarer och
påminnelser via web-push.

Tavlan är **delad** — alla inloggade ser samma grupper, och objekt tilldelas
personer via `assigned_to`.

| Tabell                | Roll                                         |
| --------------------- | -------------------------------------------- |
| `todo_lists`          | grupper (färg, ordning, hopfälld, arkiverad) |
| `todo_tasks`          | objekt                                       |
| `todo_subtasks`       | underobjekt                                  |
| `todo_board_settings` | tavlans titel, dolda kolumner, automationer  |
| `todo_app_push_subs`  | push-prenumerationer per `app_users`-rad     |

`todo_boards` är den gamla jsonb-tavlan från ai-labb-appen. Den lämnades orörd
som backup vid importen och läses inte av den här appen.

## Databas

Migrationer ligger i `supabase/migrations/` och körs i nummerordning via
Supabase SQL-editorn eller CLI:t.

`0003_todo_lock_down_rls.sql` får bara köras **efter** att service-role-nyckeln
är satt och appen är deployad — se kommentaren överst i filen.

## Edge-funktioner

`supabase/functions/agency-todo-reminders` skickar dagliga push-notiser om
förfallande uppgifter. Schemaläggs av ett pg_cron-jobb kl. 06:00 och skyddas av
`cron_key` i `todo_secrets`.

## Kommandon

```bash
npx tsc --noEmit   # typkontroll
npm run build      # produktionsbygge (kör även TypeScript)
```

`npm run lint` fungerar inte — `next lint` togs bort i Next 16 och eslint är
inte installerat i projektet.

## Deploy

Vercel bygger från `main` via Git-integrationen. Root Directory är repots rot.
