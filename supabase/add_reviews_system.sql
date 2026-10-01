-- ============================================================
-- TAILORAM: Reviews & Ratings System
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- 1. Everyone can read reviews and ratings
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- 2. Authenticated users can write a review for a designer
drop policy if exists "Clients can submit reviews" on public.reviews;
create policy "Clients can submit reviews"
  on public.reviews for insert
  with check (auth.uid() = client_id);

-- 3. Users can edit their own reviews
drop policy if exists "Clients can update their own reviews" on public.reviews;
create policy "Clients can update their own reviews"
  on public.reviews for update
  using (auth.uid() = client_id);

-- 4. Users can delete their own reviews
drop policy if exists "Clients can delete their own reviews" on public.reviews;
create policy "Clients can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = client_id);

-- Permissions
grant all on public.reviews to anon, authenticated;
