-- Annonsverktyget: exempelposter på en mall.
--
-- Ett exempel är en färdig annons som gjorts med mallen tidigare, och ger
-- kontext om hur mallen ska användas (vilken sorts budskap, hur lång text,
-- vilken bild som passar). Exemplet är en vanlig rad i ad_assets med
-- kind = 'example' och parent_id som pekar på mallen. Då gäller samma
-- företagsisolering, lagringstak och filkontroller som för övriga tillgångar,
-- och exemplen försvinner med mallen (on delete cascade).

alter table public.ad_assets drop constraint if exists ad_assets_kind_check;
alter table public.ad_assets add constraint ad_assets_kind_check check (kind in ('photo', 'overlay', 'example'));

alter table public.ad_assets add column if not exists parent_id uuid references public.ad_assets(id) on delete cascade;

-- Ett exempel hör alltid till en mall, och inget annat har en förälder.
alter table public.ad_assets add constraint ad_assets_parent_check check ((kind = 'example') = (parent_id is not null));

create index if not exists ad_assets_parent_idx on public.ad_assets (parent_id) where parent_id is not null;
