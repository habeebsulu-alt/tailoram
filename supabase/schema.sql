-- ============================================================
-- TAILORAM: Nigerian Fashion Marketplace Database Schema
-- ============================================================

-- 1. PROFILES TABLE
-- Stores user identity and role (designer or client)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('designer', 'client')),
  full_name text not null,
  created_at timestamptz not null default now()
);

-- 2. DESIGNER PROFILES TABLE
-- Stores business information for tailors and fashion designers
create table if not exists public.designer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  business_name text not null,
  bio text,
  city text not null default 'Lagos',
  area text not null, -- Neighborhood within Lagos (e.g., Ikeja, Lekki, Yaba, Surulere)
  categories text[] not null default '{}', -- e.g. {'ankara', 'aso_ebi', 'native_wear', 'corporate', 'bridal'}
  whatsapp text,
  created_at timestamptz not null default now()
);

-- 3. PORTFOLIO ITEMS TABLE
-- Showcase photos and short videos for designer work
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')) default 'image',
  caption text,
  created_at timestamptz not null default now()
);

-- 4. REQUESTS TABLE
-- Client custom clothes orders sent to specific designers
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  style_description text not null,
  fabric text,
  budget_min numeric not null check (budget_min >= 0),
  budget_max numeric check (budget_max is null or budget_max >= budget_min),
  deadline date,
  reference_image_url text,
  status text not null check (status in ('pending', 'accepted', 'declined', 'completed')) default 'pending',
  created_at timestamptz not null default now()
);

-- 5. MESSAGES TABLE
-- Chat between client and designer for a specific request
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 6. EVENTS TABLE (Analytics from Day 1)
-- Tracks searches, profile views, requests, and conversions for future monetization
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'search', 'profile_view', 'request_sent', 'request_status_change'
  user_id uuid references public.profiles(id) on delete set null,
  designer_id uuid references public.designer_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.designer_profiles enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.requests enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- PROFILES POLICIES
-- Anyone can view profile names and roles
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can only insert or edit their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- DESIGNER PROFILES POLICIES
-- Anyone can browse designer profiles
create policy "Designer profiles are viewable by everyone"
  on public.designer_profiles for select
  using (true);

-- Only the owner can create or update their designer profile
create policy "Designers can insert their own profile"
  on public.designer_profiles for insert
  with check (auth.uid() = user_id);

create policy "Designers can update their own profile"
  on public.designer_profiles for update
  using (auth.uid() = user_id);

-- PORTFOLIO ITEMS POLICIES
-- Anyone can view portfolio items
create policy "Portfolio items are viewable by everyone"
  on public.portfolio_items for select
  using (true);

-- Only the designer who owns the profile can add, edit, or delete items
create policy "Designers can add portfolio items"
  on public.portfolio_items for insert
  with check (
    exists (
      select 1 from public.designer_profiles
      where id = portfolio_items.designer_id and user_id = auth.uid()
    )
  );

create policy "Designers can update their portfolio items"
  on public.portfolio_items for update
  using (
    exists (
      select 1 from public.designer_profiles
      where id = portfolio_items.designer_id and user_id = auth.uid()
    )
  );

create policy "Designers can delete their portfolio items"
  on public.portfolio_items for delete
  using (
    exists (
      select 1 from public.designer_profiles
      where id = portfolio_items.designer_id and user_id = auth.uid()
    )
  );

-- REQUESTS POLICIES
-- Only the client who made the request and the recipient designer can view it
create policy "Participants can view their requests"
  on public.requests for select
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.designer_profiles
      where id = requests.designer_id and user_id = auth.uid()
    )
  );

-- Clients can create requests
create policy "Clients can create requests"
  on public.requests for insert
  with check (auth.uid() = client_id);

-- Both client and designer can update the request (e.g. status changes)
create policy "Participants can update their requests"
  on public.requests for update
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.designer_profiles
      where id = requests.designer_id and user_id = auth.uid()
    )
  );

-- MESSAGES POLICIES
-- Only client and designer involved in the request can read messages
create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.requests r
      where r.id = messages.request_id
      and (
        r.client_id = auth.uid()
        or exists (
          select 1 from public.designer_profiles dp
          where dp.id = r.designer_id and dp.user_id = auth.uid()
        )
      )
    )
  );

-- Only participants can send messages, and sender_id must match auth.uid()
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.requests r
      where r.id = messages.request_id
      and (
        r.client_id = auth.uid()
        or exists (
          select 1 from public.designer_profiles dp
          where dp.id = r.designer_id and dp.user_id = auth.uid()
        )
      )
    )
  );

-- EVENTS POLICIES (Analytics)
-- Any visitor (logged in or guest) can insert analytics events
create policy "Anyone can insert events"
  on public.events for insert
  with check (true);

-- Only authenticated users can view their own logged events (or admin dashboard later)
create policy "Users can view their own events"
  on public.events for select
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS SETUP
-- ============================================================
-- Create public storage buckets for portfolio media and reference images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('portfolio', 'portfolio', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('requests', 'requests', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage policies: Anyone can view portfolio images
create policy "Public can view portfolio files"
  on storage.objects for select
  using (bucket_id = 'portfolio' or bucket_id = 'requests');

-- Authenticated users can upload to portfolio and requests buckets
create policy "Authenticated users can upload portfolio files"
  on storage.objects for insert
  with check (bucket_id in ('portfolio', 'requests') and auth.role() = 'authenticated');

create policy "Authenticated users can update their uploaded files"
  on storage.objects for update
  using (bucket_id in ('portfolio', 'requests') and auth.role() = 'authenticated');

create policy "Authenticated users can delete their uploaded files"
  on storage.objects for delete
  using (bucket_id in ('portfolio', 'requests') and auth.role() = 'authenticated');

-- ============================================================
-- SUPABASE REALTIME ENABLEMENT
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
