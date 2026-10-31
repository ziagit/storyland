-- Kidstory: site visits, recorded by the visit tracker and read by kidstory-api's visitors agent
-- Run this once in the Supabase SQL Editor for the existing project
-- (supabase/schema.sql already includes it for fresh installs).

-- One row per visit: a browser's stay on the site, ending after 30 minutes
-- without activity. The tracker (app/plugins/visit-tracker.client.ts) sends the
-- whole visit as it grows, and POST /api/visits upserts it by `id`.
-- `visitor_id` is a random id kept in the browser's localStorage, so a visitor
-- is a browser, not a person; nothing else identifies them (no IP, no account).
-- `active_seconds` only counts time the tab was visible and the reader active in
-- the last 10 minutes. `pages` lists each path in the order first seen, with
-- the seconds spent on it: [{"path": "/stories/x", "seconds": 42}].
create table if not exists public.site_visits (
  id uuid primary key,
  visitor_id uuid not null,
  is_new boolean not null default true,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  page_views integer not null default 1 check (page_views >= 0),
  pages jsonb not null default '[]'::jsonb,
  entry_path text not null,
  referrer text,
  device text check (device in ('mobile', 'tablet', 'desktop')),
  country text
);

create index if not exists site_visits_started_at_idx on public.site_visits (started_at desc);
create index if not exists site_visits_last_seen_at_idx on public.site_visits (last_seen_at desc);
create index if not exists site_visits_visitor_id_idx on public.site_visits (visitor_id);

-- No policies: only the Nuxt server (writes) and kidstory-api (reads) touch it,
-- both with the service-role key.
alter table public.site_visits enable row level security;

-- All-time totals, so the agent doesn't page through every visit to count visitors.
-- security_invoker keeps the table's RLS in force for anyone but the service role.
create or replace view public.site_visit_totals with (security_invoker = true) as
select
  count(distinct visitor_id)::int as visitors,
  count(*)::int as visits,
  coalesce(sum(page_views), 0)::int as page_views,
  coalesce(sum(active_seconds), 0)::bigint as active_seconds,
  min(started_at) as first_visit_at
from public.site_visits;

-- The agent machine records visitors agent runs too (see 005_agent_runs.sql).
do $$
begin
  if to_regclass('public.agent_runs') is not null then
    alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
    alter table public.agent_runs add constraint agent_runs_agent_check
      check (agent in ('story', 'social', 'books', 'support', 'visitors'));
  end if;
end $$;

notify pgrst, 'reload schema';
