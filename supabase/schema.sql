-- Kidstory: stories table
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query) for your project.

create table if not exists public.stories (
  slug text primary key,
  title text not null,
  emoji text not null default '✨',
  excerpt text not null,
  category text not null,
  age_range text not null,
  read_time_minutes integer not null default 2,
  tags text[] not null default '{}',
  body text[] not null,
  cover_image_url text,
  published_at timestamptz not null default now()
);

create index if not exists stories_published_at_idx on public.stories (published_at desc);
create index if not exists stories_category_idx on public.stories (category);

-- Row Level Security: anyone can read stories, only the service role (server-side) can write.
alter table public.stories enable row level security;

drop policy if exists "Public read access" on public.stories;
create policy "Public read access"
  on public.stories
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy is created for anon/authenticated, so only requests
-- using the service_role key (server-side only, e.g. /studio publish and the seed route)
-- can write. The service role bypasses RLS entirely.

-- Added for the auto-publishing script (scripts/daily-post.ts, run every 12 hours via
-- GitHub Actions): tracks which seed topics from shared/utils/topic-pool.ts have already
-- been used, so scheduled runs don't repeat a topic. Never read by the public site.
create table if not exists public.used_topics (
  topic text primary key,
  used_at timestamptz not null default now()
);

create index if not exists used_topics_used_at_idx on public.used_topics (used_at desc);

-- No RLS policies at all (not even a read one) — this table is only ever touched by
-- the service role from scripts/daily-post.ts, never by the public site.
alter table public.used_topics enable row level security;

-- Added for the paywall (Stripe one-time "Full Access" purchase): whether a story
-- requires payment to read in full. Defaults to true so every newly published story
-- (via /studio or the auto-post script) is paywalled unless explicitly marked free.
alter table public.stories add column if not exists is_premium boolean not null default true;

-- One-time backfill: the 5 oldest stories (by published_at) stay free forever as a
-- sample of the catalog, regardless of how many new (paywalled) stories get published
-- later. Safe to re-run — it always resolves to the same 5 slugs as long as their
-- published_at values don't change.
update public.stories set is_premium = false
where slug in (
  select slug from public.stories order by published_at asc limit 5
);

-- Tracks who has purchased full access. One row per paying user, written only by the
-- Stripe webhook handler (service role) after a successful payment_intent.succeeded
-- event — never inserted/updated by the client or the anon/authenticated roles.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  purchased_at timestamptz not null default now()
);

-- Renamed from a Stripe Checkout Session id to a PaymentIntent id after switching from
-- Stripe's hosted Checkout page to an embedded, custom-branded Payment Element — the
-- table had zero rows at the time, so this is a plain rename, not a data migration.
alter table public.entitlements drop column if exists stripe_checkout_session_id;
alter table public.entitlements add column if not exists stripe_payment_intent_id text;

alter table public.entitlements enable row level security;

-- No policies for anon/authenticated: the site's own API routes always read this table
-- via the service-role client (server/utils/entitlement.ts), after independently
-- verifying the caller's Supabase auth token — so there's no need to expose it to
-- direct client-side queries at all.

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

-- One row per daily digest on the children's books selling best. The agent
-- researches bestseller lists on the web and writes the text itself; `books`
-- holds the books it names ({title, author, ages, why}) and `sources` the pages
-- the rankings came from ({title, url}). Always free to read.
create table if not exists public.book_digests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  emoji text not null default '📚',
  excerpt text not null,
  body text[] not null,
  books jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  cover_image_url text,
  published_at timestamptz not null default now()
);

create index if not exists book_digests_published_at_idx on public.book_digests (published_at desc);

alter table public.book_digests enable row level security;

-- Anyone can read digests; only kidstory-api's service-role client writes them.
drop policy if exists "Book digests are publicly readable" on public.book_digests;
create policy "Book digests are publicly readable"
  on public.book_digests
  for select
  to anon, authenticated
  using (true);

-- Agent activity for the admin dashboard's live agent machine (migration 005).
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
alter table public.agent_runs enable row level security;

-- Site visits from the visit tracker, read by kidstory-api's visitors agent (migration 006).
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
alter table public.site_visits enable row level security;

create or replace view public.site_visit_totals with (security_invoker = true) as
select
  count(distinct visitor_id)::int as visitors,
  count(*)::int as visits,
  coalesce(sum(page_views), 0)::int as page_views,
  coalesce(sum(active_seconds), 0)::bigint as active_seconds,
  min(started_at) as first_visit_at
from public.site_visits;

do $$
begin
  if to_regclass('public.agent_runs') is not null then
    alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
    alter table public.agent_runs add constraint agent_runs_agent_check
      check (agent in ('story', 'social', 'books', 'support', 'visitors'));
  end if;
end $$;
