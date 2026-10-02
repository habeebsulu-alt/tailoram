-- ==============================================================================
-- Tailoram - Add Missing Designer Profile Columns
-- Fixes: "could not find gender_focus column" and ensures all designer features work
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure all columns exist on designer_profiles
alter table if exists public.designer_profiles
  add column if not exists gender_focus text default 'unisex',
  add column if not exists has_store boolean default false,
  add column if not exists store_name text,
  add column if not exists profile_image_url text,
  add column if not exists cover_image_id text,
  add column if not exists cover_image_url text,
  add column if not exists is_verified boolean default false,
  add column if not exists is_featured boolean default false;

-- 2. Ensure profile_image_url exists on profiles
alter table if exists public.profiles
  add column if not exists profile_image_url text;

-- 3. Security Definer RPC for Setting Designer Homepage Cover Image
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

grant execute on function public.set_designer_cover_image(uuid, text, text) to anon, authenticated, service_role;

-- 4. Reload PostgREST schema cache so Supabase immediately recognizes the new columns
notify pgrst, 'reload schema';
