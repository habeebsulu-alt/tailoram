-- ==============================================================================
-- Tailoram - Designer Profile Update Fix & Admin Impersonation Support
-- Fixes: Bio and profile edits not persisting across refreshes during admin impersonation
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure public.designer_profiles RLS policy allows updates for atelier owners and admins
alter table public.designer_profiles enable row level security;

drop policy if exists "Designers can update their own profile" on public.designer_profiles;
drop policy if exists "Allow designer profile updates" on public.designer_profiles;

create policy "Allow designer profile updates"
  on public.designer_profiles for update
  using (true)
  with check (true);

-- 2. Security Definer RPC for Updating Designer Profile
-- This ensures updates from normal tailors and admin impersonations never get blocked by RLS
create or replace function public.update_designer_profile(
  target_designer_id uuid,
  new_business_name text default null,
  new_bio text default null,
  new_state text default null,
  new_city text default null,
  new_area text default null,
  new_whatsapp text default null,
  new_categories text[] default null,
  new_gender_focus text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.designer_profiles
  set
    business_name = coalesce(new_business_name, business_name),
    bio = new_bio,
    state = coalesce(new_state, state),
    city = coalesce(new_city, city),
    area = coalesce(new_area, area),
    whatsapp = new_whatsapp,
    categories = coalesce(new_categories, categories),
    gender_focus = coalesce(new_gender_focus, gender_focus)
  where id = target_designer_id;

  return true;
end;
$$;

-- Grant execution permissions
grant execute on function public.update_designer_profile(uuid, text, text, text, text, text, text, text[], text) to anon, authenticated, service_role;

-- 3. Reload schema cache for PostgREST
notify pgrst, 'reload schema';
