# Milou Verktyg

Next.js-app med fem verktyg: **Mediaplaner**, **Kampanjer**, **Uppgifter**,
**Formatkoll** och **SEO/GEO-audit**.

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
ANTHROPIC_API_KEY=...        # valfri, se SEO/GEO-audit
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

## SEO/GEO-audit

Publikt säljverktyg på `/share/audit`, tänkt att bäddas in på milou.se med
iframe. Besökaren anger en webbadress och får ett betyg 1–10 (plus delbetyg för
SEO och GEO) direkt.

**Flera sidor.** `src/lib/audit/crawl.ts` granskar startsidan plus upp till nio
undersidor: menylänkar först, sedan sitemap, högst två per sektion, aldrig
sidor som robots.txt spärrar. Hämtningen har en budget på 25 s. Sidkontroller
(titel, H1, schema …) körs per sida och vägs ihop efter andelen godkända sidor;
sajtkontroller (HTTPS, robots.txt, sitemap, trasiga länkar, dubblerade titlar)
körs en gång. För att se 3–5 åtgärdspunkter lämnar besökaren e-post.
Leads och alla körningar syns internt på `/audit`.

| Tabell | Roll |
| --- | --- |
| `audit_runs` | en rad per granskning: betyg, kontroller, granskade sidor, utdrag, åtgärder |
| `audit_leads` | e-post och samtycke, kopplat till en körning |

Båda nekar anon-rollen. Den publika sidan pratar bara med
`/api/public/audit/run` och `/api/public/audit/unlock`, som är undantagna från
inloggningen i `src/proxy.ts` och skriver med service-role-nyckeln.

**Betyget** räknas av fasta kontroller i `src/lib/audit/checks.ts`, inte av en
språkmodell, så samma sida får samma betyg varje gång. Varje kontroll har en
vikt inom sin grupp (SEO eller GEO); grupperna vägs lika.

**Åtgärderna** skrivs av Claude (`src/lib/audit/advice.ts`, modell via
`AUDIT_MODEL`, standard `claude-opus-5-5` på låg effort) först när någon låser
upp, och sparas på körningen. Claude anropas alltså högst en gång per körning
och bara för besökare som lämnat e-post. Utan `ANTHROPIC_API_KEY`, eller om
anropet misslyckas, byggs punkterna av kontrollernas egna fix-texter.

**Hämtningen** (`src/lib/audit/fetch.ts`) är en SSRF-yta: besökaren väljer vilken
adress servern ska anropa. Varje anslutning, också efter omdirigering, går via
en DNS-uppslagning som vägrar privata och reserverade adresser. Bara port 80
och 443, högst 3 MB, 10 s.

**Demoläge.** `AUDIT_DEMO=1` kör verktyget utan databas: körningar hålls i
minnet och leads sparas inte. Bara för lokala visningar — sätt det aldrig i
Vercel, där minnet inte delas mellan instanser.

**Begränsningar.** Samma URL återanvänds i 24 timmar. Varje IP (lagras bara som
hash) får göra 10 nya körningar per timme.

**Inbäddning.** `next.config.mjs` tillåter att `/share/audit` ramas in från
milou.se och dess subdomäner. Sidan skickar sin höjd till förälderfönstret:

```html
<iframe id="milou-audit" src="https://<appens-domän>/share/audit"
        style="width:100%;border:0" title="SEO- och GEO-koll"></iframe>
<script>
  addEventListener("message", (e) => {
    if (e.data?.type === "milou-audit-height")
      document.getElementById("milou-audit").style.height = e.data.height + "px";
  });
</script>
```

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
