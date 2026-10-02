-- ==============================================================================
-- Tailoram - Designer Homepage Cover / Starting Badge Photo Selection
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Add cover_image_id and cover_image_url columns to designer_profiles
alter table if exists public.designer_profiles
  add column if not exists cover_image_id text;

alter table if exists public.designer_profiles
  add column if not exists cover_image_url text;

-- 2. Security Definer RPC for Setting Designer Homepage Cover Image
-- This allows both atelier owners and admin sessions to update the cover image
-- without being restricted by RLS auth.uid() rules.
create or replace function public.set_designer_cover_image(
  target_designer_id uuid,
  new_cover_image_id text,
  new_cover_image_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.designer_profiles
  set
    cover_image_id = new_cover_image_id,
    cover_image_url = new_cover_image_url
  where id = target_designer_id;

  return true;
end;
$$;

-- Grant execution permissions
grant execute on function public.set_designer_cover_image(uuid, text, text) to anon, authenticated, service_role;
