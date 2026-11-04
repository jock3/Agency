-- AI-sammanfattning av en tillgänglighetsgranskning. Betyget kommer fortfarande
-- från axe-core och score.ts; det här är text som Claude skriver ovanpå fynden.

alter table public.a11y_runs add column if not exists ai_summary text;
