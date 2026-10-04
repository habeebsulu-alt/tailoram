-- ==============================================================================
-- Tailoram - Admin Role Updates & Security Definer Controls
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Security Definer RPC to update a user's role (bypasses client-side RLS restrictions)
create or replace function public.admin_update_profile_role(target_user_id uuid, new_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = new_role
  where id = target_user_id;

  return true;
end;
$$;

grant execute on function public.admin_update_profile_role(uuid, text) to anon, authenticated, service_role;

-- 2. Permissive UPDATE policy on profiles table
drop policy if exists "Allow profile role updates" on public.profiles;
create policy "Allow profile role updates"
  on public.profiles
  for update
  using (true)
  with check (true);

-- 3. Permissive UPDATE policy on designer_profiles table
drop policy if exists "Allow designer_profiles updates" on public.designer_profiles;
create policy "Allow designer_profiles updates"
  on public.designer_profiles
  for update
  using (true)
  with check (true);

-- 4. Permissive ALL policy on store_products
drop policy if exists "Allow store_products updates" on public.store_products;
create policy "Allow store_products updates"
  on public.store_products
  for all
  using (true)
  with check (true);

-- 5. Ensure platform_settings table grants and policies
grant all on public.platform_settings to anon, authenticated, service_role;
