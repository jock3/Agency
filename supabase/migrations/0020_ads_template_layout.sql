-- Annonsverktyget, steg 3: mallredigeraren.
--
-- En mall är en PNG som placeras ovanpå fotot, inte hela bilden: banderoller
-- och splashar i olika storlekar. Layouten har därför två delar:
--   zones      textytorna på mallen, i andelar av mallens egen storlek, så att
--              de följer med när mallen flyttas eller skalas. Samma för alla format.
--   placements var mallen ligger och hur stor den är, per format (1:1, 4:5, 9:16).
-- Layouten är ett jsonb-dokument på mallens rad. Det gör att hela layouten
-- sparas i ett enda atomärt skrivande, och valideringen görs i
-- src/lib/ads/layout.ts innan något skrivs.
--
-- Handoffens separata tabell overlay_templates antog mallar i full bildstorlek
-- med textyta per format; det stämmer inte med de riktiga mallarna.

alter table public.ad_assets add column if not exists layout jsonb;

-- Bara mallar har en layout.
alter table public.ad_assets add constraint ad_assets_layout_check check (layout is null or kind = 'overlay');
