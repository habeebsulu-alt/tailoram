-- ==============================================================================
-- Tailoram - Fix Requests, Messages & Reviews Row Level Security (RLS)
-- Supports: Bespoke Requests, Body Measurements, Realtime Chat, & Bidirectional Reviews
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure public.requests has column for measurements and fully permissive RLS
alter table public.requests add column if not exists measurements jsonb;
alter table public.requests enable row level security;

drop policy if exists "Clients can create requests" on public.requests;
drop policy if exists "Participants can view their requests" on public.requests;
drop policy if exists "Participants can update their requests" on public.requests;
drop policy if exists "Allow client request creation" on public.requests;
drop policy if exists "Allow viewing requests" on public.requests;
drop policy if exists "Allow updating requests" on public.requests;
drop policy if exists "Allow deleting requests" on public.requests;

-- Allow any user (authenticated, demo, or anon) to submit a bespoke outfit request
create policy "Allow client request creation"
  on public.requests for insert
  with check (true);

-- Allow viewing requests
create policy "Allow viewing requests"
  on public.requests for select
  using (true);

-- Allow updating requests (status changes, quotes, payments, etc.)
create policy "Allow updating requests"
  on public.requests for update
  using (true)
  with check (true);

-- Allow deleting requests
create policy "Allow deleting requests"
  on public.requests for delete
  using (true);

-- Grant table permissions
grant all on public.requests to anon, authenticated, service_role;


-- 2. Ensure public.reviews allows bidirectional order reviews (Client-to-Designer & Designer-to-Client)
alter table public.reviews add column if not exists reviewer_id uuid;
alter table public.reviews add column if not exists reviewee_id uuid;
alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
drop policy if exists "Clients can submit reviews" on public.reviews;
drop policy if exists "Clients can update their own reviews" on public.reviews;
drop policy if exists "Clients can delete their own reviews" on public.reviews;
drop policy if exists "Participants can submit reviews" on public.reviews;
drop policy if exists "Allow viewing reviews" on public.reviews;
drop policy if exists "Allow inserting reviews" on public.reviews;
drop policy if exists "Allow updating reviews" on public.reviews;
drop policy if exists "Allow deleting reviews" on public.reviews;

create policy "Allow viewing reviews"
  on public.reviews for select
  using (true);

create policy "Allow inserting reviews"
  on public.reviews for insert
  with check (true);

create policy "Allow updating reviews"
  on public.reviews for update
  using (true)
  with check (true);

create policy "Allow deleting reviews"
  on public.reviews for delete
  using (true);

grant all on public.reviews to anon, authenticated, service_role;


-- 3. Ensure public.messages has fully permissive RLS
alter table public.messages enable row level security;

drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Allow reading messages" on public.messages;
drop policy if exists "Allow sending messages" on public.messages;

create policy "Allow reading messages"
  on public.messages for select
  using (true);

create policy "Allow sending messages"
  on public.messages for insert
  with check (true);

grant all on public.messages to anon, authenticated, service_role;


-- 4. Ensure public.payments has fully permissive RLS
alter table if exists public.payments enable row level security;

drop policy if exists "Participants can view request payments" on public.payments;
drop policy if exists "Authenticated users can insert payments" on public.payments;
drop policy if exists "Allow viewing payments" on public.payments;
drop policy if exists "Allow inserting payments" on public.payments;

create policy "Allow viewing payments"
  on public.payments for select
  using (true);

create policy "Allow inserting payments"
  on public.payments for insert
  with check (true);

grant all on public.payments to anon, authenticated, service_role;


-- 5. Ensure storage bucket 'requests' exists and allows image uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'requests',
  'requests',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "Public can view request files" on storage.objects;
drop policy if exists "Allow upload to requests" on storage.objects;
drop policy if exists "Allow view requests bucket" on storage.objects;

create policy "Allow view requests bucket"
  on storage.objects for select
  using (bucket_id = 'requests');

create policy "Allow upload to requests"
  on storage.objects for insert
  with check (bucket_id = 'requests');

create policy "Allow update requests bucket"
  on storage.objects for update
  using (bucket_id = 'requests');

create policy "Allow delete requests bucket"
  on storage.objects for delete
  using (bucket_id = 'requests');


-- 6. Security Definer RPC for Guaranteed Request Submission (with Body Measurements support)
create or replace function public.create_custom_request(
  p_client_id uuid,
  p_designer_id uuid,
  p_style_description text,
  p_fabric text default null,
  p_budget_min numeric default 0,
  p_budget_max numeric default null,
  p_deadline text default null,
  p_reference_image_url text default null,
  p_measurements jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  insert into public.requests (
    client_id,
    designer_id,
    style_description,
    fabric,
    budget_min,
    budget_max,
    deadline,
    reference_image_url,
    measurements,
    status
  )
  values (
    p_client_id,
    p_designer_id,
    p_style_description,
    p_fabric,
    p_budget_min,
    p_budget_max,
    case when p_deadline is not null and p_deadline <> '' then p_deadline::date else null end,
    p_reference_image_url,
    p_measurements,
    'pending'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- Grant execution permissions
grant execute on function public.create_custom_request(uuid, uuid, text, text, numeric, numeric, text, text, jsonb) to anon, authenticated, service_role;

-- 7. Reload schema cache for PostgREST
notify pgrst, 'reload schema';
