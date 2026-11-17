# Roadmap: kundens granskning och godkännande av mediaplan

Status: **planerad, inte påbörjad** (sparad 2026-11-17).

## Läge idag

Kundlänken (`/share/[token]`, `src/app/share/[token]/`) är bara en visningssida.

Finns:
- Länk skapas via "Kopiera kundlänk" (`generateShareToken` i `src/lib/api/plans.ts`), slumpad token per plan.
- Visar kampanjnamn, period, total budget, beräknad räckvidd, kalendern skrivskyddad (`GanttTimeline readOnly compact`) och en lista på mobil (`MobilePlanList`).
- Kunden kan exportera bild. Märkt "Visningsläge".

Saknas:
- Godkänna, avvisa eller begära ändringar.
- Kommentarer (ingen tabell eller UI).
- Avisering och logg över vem som sett eller godkänt vad.
- Status `approved` finns på `media_plans` men sätts bara internt via inställningarna.
- Ny design (steg 1–4) – kundsidan har gamla utseendet.
- Länken kan inte förfalla eller stängas av.

## Önskat flöde

1. Kunden öppnar länken och ser planen i nya designen (samma hero och kalender som steg 4, skrivskyddat).
2. Längst ner: knappar **Godkänn** och **Begär ändringar** + kommentarsfält.
3. Kunden anger namn (och ev. kommentar). Ingen inloggning – länken är hemlig.
4. Godkänn → planen blir `approved`, tid och namn sparas. Begär ändringar → status `changes_requested`, kommentaren sparas.
5. Byrån ser status och kommentar i planens huvud (PlanHeader) och på kortet (PlanCard / CampaignCard).
6. Ändras planen efter godkännande nollställs godkännandet, så kunden bara står för det den faktiskt sett.

## Teknisk skiss

- Ny tabell `mplan_approvals` (prefix `mplan_`, `mp_` är upptaget): `id`, `plan_id`, `decision` (`approved` | `changes_requested`), `name`, `comment`, `created_at`, ev. `plan_snapshot_hash`.
  - RLS på, inga policies, `revoke all` från `anon` och `authenticated`. Läses/skrivs bara via server med admin-klient.
- Ny status `changes_requested` i `CampaignPlanStatus`/`media_plans.status` (kontrollera check-constraint).
- Server-åtgärd `submitApproval(token, decision, name, comment)` som slår upp planen via `share_token`, validerar indata och rate-limitar.
- Nollställning: spara hash av planens innehåll vid godkännande; vid `updatePlan`/radändringar, om hash skiljer → status tillbaka till `active` och markera godkännandet som inaktuellt.
- Kundsidan byggs om med `PlanHeader` (readOnly, utan interna knappar) + `GanttTimeline readOnly`.
- Senare: länk som kan stängas av eller förfalla (`share_expires_at`, knapp "Stäng kundlänk").

## Öppna frågor (beslutas vid implementation)

- Godkänna hela planen i ett svep, eller per kanal?
- Mejlavisering när kunden svarar, eller räcker det att se det i verktyget?
