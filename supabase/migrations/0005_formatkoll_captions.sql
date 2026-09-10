-- Text per placering.
--
-- `caption` är fortfarande den delade texten och används överallt där inget
-- annat står. `captions` är en karta från placerings-id till egen text, och
-- innehåller bara de kanaler som faktiskt fått en avvikande text. Kanaler som
-- saknar nyckel ärver den delade texten.
--
-- En jsonb-kolumn i stället för en tabell: uppslagen görs alltid för hela
-- projektet på en gång, det finns som mest åtta nycklar, och ingen del av
-- appen behöver fråga efter en enskild kanals text utan resten.

alter table public.formatkoll_projects
  add column if not exists captions jsonb not null default '{}'::jsonb;
