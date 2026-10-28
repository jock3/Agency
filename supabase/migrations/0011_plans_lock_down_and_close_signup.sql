-- Close the anon hole on the media plan and campaign tables, and close open signup.
--
-- The plan and campaign tables carried policies such as "Full access plans" and
-- "service role full access campaigns" that applied to every role. The anon key
-- ships in the browser bundle, so anyone could read, rewrite or delete every
-- client's plans straight through PostgREST.
--
-- The app no longer needs that access. Plans and campaigns go through Server
-- Functions in src/lib/api/*, which validate the session cookie and then use the
-- service role; the share pages read with the service role too. Same model as
-- 0003 for the todo tables: RLS on, no policies, grants revoked.
--
-- ORDER MATTERS. Deploy the app version that uses the Server Functions first.
-- Applying this early breaks /mediaplan and /kampanj in production.
--
-- The Supabase project is shared with other apps. None of the live ones read
-- these tables (checked 2026-10-28: only the retired jock3/claude apps/mediaplan
-- did, and apps/kampanj queries a `campaigns` shape that no longer exists).

drop policy if exists "Full access plans"                     on public.media_plans;
drop policy if exists "Public read via share token"           on public.media_plans;
drop policy if exists "Full access categories"                on public.media_categories;
drop policy if exists "Public read categories"                on public.media_categories;
drop policy if exists "Full access concepts"                  on public.media_concepts;
drop policy if exists "Public read concepts"                  on public.media_concepts;
drop policy if exists "Full access lines"                     on public.media_lines;
drop policy if exists "Public read lines"                     on public.media_lines;
drop policy if exists "allow all"                             on public.media_deadlines;
drop policy if exists "service role full access campaign_plans"     on public.campaign_plans;
drop policy if exists "service role full access campaigns"          on public.campaigns;
drop policy if exists "service role full access campaign_platforms" on public.campaign_platforms;

alter table public.media_plans        enable row level security;
alter table public.media_categories   enable row level security;
alter table public.media_concepts     enable row level security;
alter table public.media_lines        enable row level security;
alter table public.media_deadlines    enable row level security;
alter table public.campaign_plans     enable row level security;
alter table public.campaigns          enable row level security;
alter table public.campaign_platforms enable row level security;

revoke all on public.media_plans        from anon, authenticated;
revoke all on public.media_categories   from anon, authenticated;
revoke all on public.media_concepts     from anon, authenticated;
revoke all on public.media_lines        from anon, authenticated;
revoke all on public.media_deadlines    from anon, authenticated;
revoke all on public.campaign_plans     from anon, authenticated;
revoke all on public.campaigns          from anon, authenticated;
revoke all on public.campaign_platforms from anon, authenticated;

-- No open signup. Accounts are created by an admin on /admin, which calls
-- app_signup server-side with the service role. PUBLIC held EXECUTE by default,
-- so it has to be revoked alongside anon and authenticated.
revoke execute on function public.app_signup(text, text) from public, anon, authenticated;
grant  execute on function public.app_signup(text, text) to service_role;
