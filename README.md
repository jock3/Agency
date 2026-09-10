# Milou Verktyg

Next.js-app med fyra verktyg: **Mediaplaner**, **Kampanjer**, **Uppgifter** och
**Formatkoll**.

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

## Formatkoll

`/formatkoll` är förhandsvisning av rörligt material i sociala placeringar. Ladda
upp samma film i 9:16, 1:1 och 16:9, se hur den ser ut i åtta placeringar över
sex kanaler, och skicka en läslänk till kund.

Verktyget croppar inte och transkodar inte. Redaktören exporterar tre färdiga
filer själv.

| Tabell | Roll |
| --- | --- |
| `formatkoll_projects` | projekt, slug, kund, delad inläggstext, utgång |
| `formatkoll_assets` | en rad per format och projekt |

Båda nekar anon-rollen helt. All åtkomst går via `/api/formatkoll/*`, som
validerar sessionskakan och sedan använder service-role-nyckeln.

**Uppladdning** går aldrig genom en route handler — Vercel tar emot högst 4,5 MB
kropp och filmerna är större. Servern signerar en engångs-URL, webbläsaren
laddar upp direkt mot storage-bucketen `previews`, och assetraden skrivs först
när uppladdningen gått igenom. Sökvägen är alltid `{slug}/{format}.mp4`, aldrig
originalfilnamnet.

**Delningslänken** ligger på `/share/kund/[slug]`. Sluggen är hela
åtkomstkontrollen: 12 tecken ur ett alfabet utan förväxlingsbara glyfer. Sidan
läser med service-role och filtrerar på `archived_at` och `expires_at`, eftersom
RLS inte kan uttrycka "du måste känna till sluggen". Utgången sätts till 1, 3
eller 7 dagar och kan förlängas.

Bucketen `previews` är publik. Den som redan har en films URL kommer åt den
även efter att länken gått ut — sidan slutar servera den, filen finns kvar tills
projektet raderas.

**Text per kanal.** `caption` är den delade texten. `captions` är en jsonb-karta
från placerings-id till egen text och innehåller bara kanaler som avviker.
Saknad nyckel betyder att kanalen ärver den delade texten; tom sträng är en
giltig egen text.

**Skyddszonerna** i `src/lib/formatkoll/placements.ts` kommer från plattformarnas
publicerade specar, inte från mätning på riktig telefon. Pixelunderlaget står i
kommentar per placering. Öppna ett projekt med `?kalibrera=1` för att lägga en
skärmdump över ramen och justera siffrorna — läget är avstängt i kundvyn och
påverkar aldrig den vanliga renderingen.

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
