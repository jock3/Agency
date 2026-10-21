-- Auditverktyget skickar inte längre sidutdrag till Claude, och e-postspärren
-- med åtgärdspunkter är borttagen. Nya körningar skriver därför inget utdrag.
--
-- Kolumnerna extract, summary och actions samt tabellen audit_leads lämnas
-- kvar orörda: det är billigare att låta dem ligga än att riva och sedan
-- återskapa dem om spärren kommer tillbaka.

alter table public.audit_runs alter column extract drop not null;
