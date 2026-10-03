-- ==============================================================================
-- Tailoram - Add Full Business Address Column & Update Profile RPC
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Add address column to public.designer_profiles
alter table if exists public.designer_profiles
  add column if not exists address text;

-- 2. Update the Security Definer RPC for full profile editing including address
create or replace function public.update_designer_profile(
  target_designer_id uuid,
  new_business_name text default null,
  new_bio text default null,
  new_state text default null,
  new_city text default null,
  new_area text default null,
  new_address text default null,
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
    address = coalesce(new_address, address),
    whatsapp = new_whatsapp,
    categories = coalesce(new_categories, categories),
    gender_focus = coalesce(new_gender_focus, gender_focus)
  where id = target_designer_id;

  return true;
end;
$$;

-- Grant execution permissions
grant execute on function public.update_designer_profile(uuid, text, text, text, text, text, text, text, text[], text) to anon, authenticated, service_role;

-- 3. Reload schema cache for PostgREST
notify pgrst, 'reload schema';
