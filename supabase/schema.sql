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
