-- Kidstory: Book Picks digests written by kidstory-api's books agent
-- Run this once in the Supabase SQL Editor for the existing project
-- (supabase/schema.sql already includes it for fresh installs).

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
