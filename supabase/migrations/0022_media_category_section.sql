-- Mediaplanen delas i två delar: sociala medier och extern media.
--
-- Varje kategori får en sektion. Kolumnen är tom (null) för alla befintliga
-- kategorier, så inget som finns i dag ändras eller raderas. Redigeraren döljer
-- kategorier utan sektion; kundlänken visar dem som förut.
alter table public.media_categories
  add column if not exists section text
  check (section is null or section in ('social', 'extern'));
