-- ==============================================================================
-- Tailoram - Paystack Subaccounts & Split-Payment Wallet System Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Extend designer_profiles with Bank & Paystack Subaccount Details
alter table public.designer_profiles
  add column if not exists bank_name text,
  add column if not exists bank_code text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists subaccount_code text,
  add column if not exists payout_verified boolean default false,
  add column if not exists payout_updated_at timestamptz;

-- 2. Create transactions table for split payments & designer wallet ledger
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  gross_amount numeric not null check (gross_amount >= 0),
  commission_rate numeric not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  platform_commission_amount numeric not null default 0 check (platform_commission_amount >= 0),
  designer_net_amount numeric not null check (designer_net_amount >= 0),
  payment_stage text not null check (payment_stage in ('deposit', 'balance')),
  status text not null default 'pending' check (status in ('pending', 'settled')),
  paystack_reference text not null unique,
  receipt_url text,
  client_name text,
  style_description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- Index for speedy queries on designer wallet and client history
create index if not exists idx_transactions_designer_id on public.transactions(designer_id);
create index if not exists idx_transactions_client_id on public.transactions(client_id);
create index if not exists idx_transactions_order_id on public.transactions(order_id);
create index if not exists idx_transactions_reference on public.transactions(paystack_reference);

-- Enable RLS
alter table public.transactions enable row level security;

-- Permissive policies for reading & inserting transactions
drop policy if exists "Transactions are viewable by participants and admin" on public.transactions;
create policy "Transactions are viewable by participants and admin"
  on public.transactions for select
  using (true);

drop policy if exists "Transactions can be inserted" on public.transactions;
create policy "Transactions can be inserted"
  on public.transactions for insert
  with check (true);

drop policy if exists "Transactions can be updated" on public.transactions;
create policy "Transactions can be updated"
  on public.transactions for update
  using (true)
  with check (true);

grant all on public.transactions to anon, authenticated, service_role;

-- 3. Initialize default platform commission settings in platform_settings (default 10%)
insert into public.platform_settings (key, value, updated_at)
values (
  'commission_settings',
  '{"commission_percentage": 10, "bearer": "account", "absorb_fees": true, "settlement_schedule": "next_business_day"}'::jsonb,
  now()
)
on conflict (key) do nothing;
