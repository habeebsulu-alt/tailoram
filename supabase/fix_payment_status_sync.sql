-- ==============================================================================
-- Tailoram - Fix Payment Status & Requests Synchronization
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Expand the status check constraint on public.requests to accept deposit_paid, etc.
do $$
begin
  -- Drop existing status check constraint
  alter table public.requests drop constraint if exists requests_status_check;
  
  -- Add new expanded check constraint
  alter table public.requests add constraint requests_status_check 
    check (status in (
      'pending', 
      'quoted', 
      'accepted', 
      'declined', 
      'deposit_paid', 
      'in_progress', 
      'ready_for_balance', 
      'completed', 
      'cancelled'
    ));
exception
  when others then
    raise notice 'Constraint notice: %', sqlerrm;
end $$;

-- 2. Ensure all quote and payment columns exist on public.requests
alter table public.requests 
  add column if not exists quoted_price numeric check (quoted_price is null or quoted_price >= 0),
  add column if not exists quote_deadline date,
  add column if not exists deposit_amount numeric check (deposit_amount is null or deposit_amount >= 0),
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists balance_amount numeric check (balance_amount is null or balance_amount >= 0),
  add column if not exists balance_paid_at timestamptz,
  add column if not exists measurements jsonb;

-- 3. Ensure Row Level Security (RLS) allows clients and designers to update their requests
alter table public.requests enable row level security;

drop policy if exists "Allow updating requests" on public.requests;
drop policy if exists "Participants can update their requests" on public.requests;

create policy "Allow updating requests"
  on public.requests for update
  using (true)
  with check (true);

drop policy if exists "Allow viewing requests" on public.requests;
create policy "Allow viewing requests"
  on public.requests for select
  using (true);

grant all on public.requests to anon, authenticated, service_role;

-- 4. Ensure platform_settings table exists and is fully permissive for instant cloud sync
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

drop policy if exists "Platform settings can be updated by all" on public.platform_settings;
create policy "Platform settings can be updated by all"
  on public.platform_settings for all
  using (true)
  with check (true);

grant all on public.platform_settings to anon, authenticated, service_role;
