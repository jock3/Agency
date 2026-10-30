-- AI-lagret i den interna auditen. Betygen kommer fortfarande från fasta
-- kontroller; det här är text som Claude skriver ovanpå resultatet.
--   ai_summary: sammanfattning och prioriteringar för en full audit.
--   ai:         förslag för en enskild sida (titlar, beskrivning, innehållstips).

alter table public.audit_internal_runs add column if not exists ai_summary text;
alter table public.audit_page_runs add column if not exists ai jsonb;
