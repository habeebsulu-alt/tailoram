-- ============================================================
-- TAILORAM: Quote & Payment Flow Migration
-- Adds quote details, deposit/balance tracking, payments table,
-- and bidirectional reviews between clients & ateliers.
-- ============================================================

-- 1. EXTEND REQUESTS TABLE WITH QUOTE AND PAYMENT TRACKING
alter table public.requests
  add column if not exists quoted_price numeric check (quoted_price is null or quoted_price >= 0),
  add column if not exists quote_deadline date,
  add column if not exists deposit_amount numeric check (deposit_amount is null or deposit_amount >= 0),
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists balance_amount numeric check (balance_amount is null or balance_amount >= 0),
  add column if not exists balance_paid_at timestamptz;

-- Expand the status check constraint on public.requests
-- Valid statuses: pending, quoted, accepted, declined, deposit_paid, in_progress, ready_for_balance, completed, cancelled
do $$
begin
  -- Drop existing status check constraint if it exists
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
    raise notice 'Could not alter requests_status_check: %', sqlerrm;
end $$;

-- 2. CREATE PAYMENTS TABLE (Gateway-ready mapping table)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  type text not null check (type in ('deposit', 'balance')),
  amount numeric not null check (amount >= 0),
  status text not null default 'stub_success', -- will later be 'success', 'failed', 'pending' with Paystack/Flutterwave
  gateway_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- PAYMENTS RLS POLICIES
drop policy if exists "Participants can view request payments" on public.payments;
create policy "Participants can view request payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.requests r
      where r.id = payments.request_id
      and (
        r.client_id = auth.uid()
        or exists (
          select 1 from public.designer_profiles dp
          where dp.id = r.designer_id and dp.user_id = auth.uid()
        )
      )
    )
    or auth.uid() is null -- demo session fallback
  );

drop policy if exists "Authenticated users can insert payments" on public.payments;
create policy "Authenticated users can insert payments"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.requests r
      where r.id = payments.request_id
      and r.client_id = auth.uid()
    )
    or auth.uid() is null -- demo session fallback
  );

grant all on public.payments to anon, authenticated;

-- 3. EXPAND REVIEWS TABLE (Support bidirectional reviews: client-to-designer and designer-to-client)
alter table public.reviews
  add column if not exists reviewer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists reviewee_id uuid references public.profiles(id) on delete cascade;

-- Allow designers as well as clients to insert reviews
drop policy if exists "Participants can submit reviews" on public.reviews;
create policy "Participants can submit reviews"
  on public.reviews for insert
  with check (
    auth.uid() = client_id 
    or auth.uid() = reviewer_id 
    or auth.uid() is null
  );

-- 4. ENABLE REALTIME ON PAYMENTS
do $$
begin
  alter publication supabase_realtime add table public.payments;
exception
  when others then
    raise notice 'Publication alter skipped or already present: %', sqlerrm;
end $$;
