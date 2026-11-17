-- Projektets mönster (Mediaplan steg 2 och 3) räknas fram från projektets id.
-- pattern_round räknar hur många gånger "Blanda mönster" tryckts, så att valet
-- sparas. Bara ett tillägg; 0 är standard.

alter table public.mplan_projects
  add column if not exists pattern_round int not null default 0 check (pattern_round between 0 and 1000000);
