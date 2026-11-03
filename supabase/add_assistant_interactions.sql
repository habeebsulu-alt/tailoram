-- ============================================================
-- TAILORAM: AI Assistant Interactions Table
-- Stores questions, answers, models used, and tailor feedback.
-- ============================================================

create table if not exists public.assistant_interactions (
  id uuid primary key default gen_random_uuid(),
  tailor_id text not null,
  question text not null,
  image_url text,
  answer text not null,
  model_used text not null default 'gemini-2.0-flash-lite',
  reference_jobs_count integer not null default 0,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.assistant_interactions enable row level security;

-- Policies
drop policy if exists "Tailors can view their own assistant interactions" on public.assistant_interactions;
create policy "Tailors can view their own assistant interactions"
  on public.assistant_interactions for select
  using (true);

drop policy if exists "Tailors can insert their own assistant interactions" on public.assistant_interactions;
create policy "Tailors can insert their own assistant interactions"
  on public.assistant_interactions for insert
  with check (true);

drop policy if exists "Tailors can update feedback on their own interactions" on public.assistant_interactions;
create policy "Tailors can update feedback on their own interactions"
  on public.assistant_interactions for update
  using (true);

-- Index on tailor_id and created_at for fast daily limit queries
create index if not exists idx_assistant_interactions_tailor_day
  on public.assistant_interactions (tailor_id, created_at desc);
