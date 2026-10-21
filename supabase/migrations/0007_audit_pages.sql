-- Flersidesgranskning: auditen crawlar startsidan plus upp till nio undersidor.
-- Listan över granskade sidor visas för besökaren och sparas därför bredvid
-- kontrollerna. Null på körningar från före ändringen.

alter table public.audit_runs add column if not exists pages jsonb;
