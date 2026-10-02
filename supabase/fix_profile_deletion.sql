-- ==============================================================================
-- Tailoram - Admin Profile & Designer Deletion Cascading Fix
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Security Definer RPC to delete a designer profile and all associated data
create or replace function public.admin_delete_designer(target_designer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_uuid uuid;
begin
  -- Retrieve user_id associated with this designer
  select user_id into target_user_uuid
  from public.designer_profiles
  where id = target_designer_id;

  -- 1. Delete messages linked to requests for this designer
  delete from public.messages
  where request_id in (
    select id from public.requests where designer_id = target_designer_id
  );

  -- 2. Delete reviews for this designer
  delete from public.reviews
  where designer_id = target_designer_id;

  -- 3. Delete bespoke requests for this designer
  delete from public.requests
  where designer_id = target_designer_id;

  -- 4. Delete portfolio items for this designer
  delete from public.portfolio_items
  where designer_id = target_designer_id;

  -- 5. Delete store products for this designer
  delete from public.store_products
  where designer_id = target_designer_id;

  -- 6. Delete analytics events for this designer
  delete from public.events
  where designer_id = target_designer_id;

  -- 7. Delete the designer profile itself
  delete from public.designer_profiles
  where id = target_designer_id;

  return true;
end;
$$;

-- 2. Security Definer RPC to delete a user profile (client, designer, or admin)
create or replace function public.admin_delete_profile(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d_rec record;
begin
  -- If this user is a designer, delete all designer data first
  for d_rec in select id from public.designer_profiles where user_id = target_user_id
  loop
    perform public.admin_delete_designer(d_rec.id);
  end loop;

  -- Delete requests where user was the client
  delete from public.messages
  where sender_id = target_user_id or request_id in (
    select id from public.requests where client_id = target_user_id
  );

  delete from public.reviews
  where client_id = target_user_id;

  delete from public.requests
  where client_id = target_user_id;

  delete from public.events
  where user_id = target_user_id;

  -- Delete from profiles
  delete from public.profiles
  where id = target_user_id;

  return true;
end;
$$;

-- Grant execution permissions
grant execute on function public.admin_delete_designer(uuid) to anon, authenticated, service_role;
grant execute on function public.admin_delete_profile(uuid) to anon, authenticated, service_role;

-- 3. Enable permissive DELETE policies on designer_profiles & profiles
alter table public.designer_profiles enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Allow designer_profiles deletion" on public.designer_profiles;
create policy "Allow designer_profiles deletion"
  on public.designer_profiles
  for delete
  using (true);

drop policy if exists "Allow profiles deletion" on public.profiles;
create policy "Allow profiles deletion"
  on public.profiles
  for delete
  using (true);
