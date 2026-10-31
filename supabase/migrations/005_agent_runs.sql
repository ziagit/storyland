-- Kidstory: agent activity for the admin dashboard's live agent machine
-- Run this once in the Supabase SQL Editor for the existing project
-- (supabase/schema.sql already includes it for fresh installs).

-- One row per agent run (story, social, books, support) and per story publish,
-- written by kidstory-api with the service-role key. A run is inserted as
-- 'running' and updated to 'done' or 'failed' when it ends. `detail` says what
-- started it and where its work went, e.g. {"source": "studio"} or
-- {"kind": "story", "platforms": ["facebook", "email"]}.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('story', 'social', 'books', 'support')),
  action text not null default 'run',
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists agent_runs_started_at_idx on public.agent_runs (started_at desc);

-- No policies: only kidstory-api's service-role client reads or writes it.
alter table public.agent_runs enable row level security;
