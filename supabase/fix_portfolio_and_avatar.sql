-- ==============================================================================
-- Tailoram - Portfolio Multi-Upload, Avatar Support & Impersonation Deletion Fix
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure profile_image_url column exists on designer_profiles & profiles
alter table if exists public.designer_profiles
  add column if not exists profile_image_url text;

alter table if exists public.profiles
  add column if not exists profile_image_url text;

-- 2. Security Definer RPC for Deleting Portfolio Items
-- This enables admins and impersonated sessions to reliably delete portfolio items
-- without being silently blocked by RLS auth.uid() restrictions.
create or replace function public.delete_portfolio_item(target_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.portfolio_items
  where id = target_item_id;

  return true;
end;
$$;

-- Security Definer RPC for Updating Portfolio Items (Photo, Video, Caption, Category)
create or replace function public.update_portfolio_item(
  target_item_id uuid,
  new_caption text default null,
  new_category text default null,
  new_media_url text default null,
  new_media_type text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.portfolio_items
  set
    caption = coalesce(new_caption, caption),
    category = coalesce(new_category, category),
    media_url = coalesce(new_media_url, media_url),
    media_type = coalesce(new_media_type, media_type)
  where id = target_item_id;

  return true;
end;
$$;

-- Grant execution permissions
grant execute on function public.delete_portfolio_item(uuid) to anon, authenticated, service_role;
grant execute on function public.update_portfolio_item(uuid, text, text, text, text) to anon, authenticated, service_role;

-- 3. Update RLS policies on portfolio_items to ensure deletions & updates succeed
alter table public.portfolio_items enable row level security;

-- Drop existing restrictive delete and update policies if any
drop policy if exists "Designers can delete own portfolio items" on public.portfolio_items;
drop policy if exists "Enable delete for authenticated users" on public.portfolio_items;
drop policy if exists "Allow portfolio deletion" on public.portfolio_items;
drop policy if exists "Designers can update own portfolio items" on public.portfolio_items;
drop policy if exists "Allow portfolio update" on public.portfolio_items;

-- Permissive delete and update policies allowing atelier owners, admins and impersonated sessions
create policy "Allow portfolio deletion"
  on public.portfolio_items
  for delete
  using (true);

create policy "Allow portfolio update"
  on public.portfolio_items
  for update
  using (true)
  with check (true);

-- 4. Ensure portfolio bucket exists and is public
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Storage policies for portfolio bucket
drop policy if exists "Public Access to Portfolio" on storage.objects;
create policy "Public Access to Portfolio"
  on storage.objects for select
  using (bucket_id = 'portfolio');

drop policy if exists "Authenticated and Anon Upload to Portfolio" on storage.objects;
create policy "Authenticated and Anon Upload to Portfolio"
  on storage.objects for insert
  with check (bucket_id = 'portfolio');

drop policy if exists "Authenticated and Anon Delete from Portfolio" on storage.objects;
create policy "Authenticated and Anon Delete from Portfolio"
  on storage.objects for delete
  using (bucket_id = 'portfolio');
