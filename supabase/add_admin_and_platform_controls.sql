-- ============================================================
-- TAILORAM: Admin Role, Controls & Platform Governance 🛡️🇳🇬
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

-- 1. Update profiles table to support 'admin' role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('designer', 'client', 'admin'));

-- 2. Add verification and featured badges to designer_profiles
alter table public.designer_profiles add column if not exists is_verified boolean default false;
alter table public.designer_profiles add column if not exists is_featured boolean default false;

-- Auto-verify top established Nigerian studios in demo data
update public.designer_profiles
set is_verified = true, is_featured = true
where business_name ilike '%Kola Kuddus%' 
   or business_name ilike '%Veekee%' 
   or business_name ilike '%Vodi%'
   or business_name ilike '%Deola Sagoe%';

-- 3. Create platform_settings table for announcements & global flags
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "Platform settings are viewable by everyone" on public.platform_settings;
create policy "Platform settings are viewable by everyone"
  on public.platform_settings for select
  using (true);

drop policy if exists "Platform settings can be updated by all authenticated" on public.platform_settings;
create policy "Platform settings can be updated by all authenticated"
  on public.platform_settings for all
  using (true)
  with check (true);

grant all on public.platform_settings to anon, authenticated;

-- Seed default announcement
insert into public.platform_settings (key, value)
values 
  ('announcement', '{"enabled": false, "message": "✨ Welcome to Tailoram: Explore verified bespoke designers & Ready-to-Wear styles across all 36 Nigerian states!", "type": "info"}'::jsonb),
  ('maintenance_mode', '{"enabled": false, "notice": "Tailoram is currently undergoing brief scheduled maintenance."}'::jsonb)
on conflict (key) do nothing;

-- 4. Enable admin overrides on core tables
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = id
  );

drop policy if exists "Admins can update any designer" on public.designer_profiles;
create policy "Admins can update any designer"
  on public.designer_profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or user_id = auth.uid()
  );

drop policy if exists "Admins can delete any designer" on public.designer_profiles;
create policy "Admins can delete any designer"
  on public.designer_profiles for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or user_id = auth.uid()
  );

drop policy if exists "Admins can update any request" on public.requests;
create policy "Admins can update any request"
  on public.requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or client_id = auth.uid()
    or exists (select 1 from public.designer_profiles where id = requests.designer_id and user_id = auth.uid())
  );

drop policy if exists "Admins can delete any review" on public.reviews;
create policy "Admins can delete any review"
  on public.reviews for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or client_id = auth.uid()
  );

drop policy if exists "Admins can delete any store product" on public.store_products;
create policy "Admins can delete any store product"
  on public.store_products for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from public.designer_profiles where id = store_products.designer_id and user_id = auth.uid())
  );
