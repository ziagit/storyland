-- Kidstory: add AI-generated cover image URL to stories
-- Run this once in the Supabase SQL Editor for the existing project
-- (supabase/schema.sql already includes this column for fresh installs).

alter table public.stories add column if not exists cover_image_url text;
