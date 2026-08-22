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
  audio_url text,
  published_at timestamptz not null default now()
);

-- Added after the initial launch: cached URL of the pre-generated read-aloud
-- narration for this story (see server/utils/tts.ts). Null until generated.
alter table public.stories add column if not exists audio_url text;

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
