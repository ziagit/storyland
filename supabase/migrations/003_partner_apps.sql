-- Kidstory: partner apps that create stories through the story agent
-- Run this once in the Supabase SQL Editor for the existing project
-- (supabase/schema.sql already includes it for fresh installs).

-- Partner apps: other people's agents that create stories through kidstory-api's
-- story agent (POST /partner/stories, /partner/mcp). Each app has its own key; only
-- its SHA-256 hash is stored, so a leaked table can't be used to call the API.
-- `runs_today`/`run_day` cap how many story-agent runs an app gets per (UTC) day.
create table if not exists public.partner_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  key_hash text not null unique,
  daily_limit integer not null default 5,
  active boolean not null default true,
  runs_today integer not null default 0,
  run_day date,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.partner_apps enable row level security;
-- No policies: only kidstory-api's service-role client reads or writes it.

-- Which partner app created a story (its name); null for the owner's own stories.
alter table public.stories add column if not exists created_by text;
