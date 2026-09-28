-- ============================================================
-- FIX RLS & EXPAND TO ALL OF NIGERIA (Idempotent Safe Run)
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

-- 1. Add state column to designer_profiles if not present
alter table public.designer_profiles 
  add column if not exists state text not null default 'Lagos';

-- 2. Drop existing policies before recreating to avoid duplicate policy error
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id or auth.uid() is null);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Automatic Trigger to create Profile and Designer Profile on Signup
-- This runs with SECURITY DEFINER (admin rights), completely bypassing RLS issues!
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  full_name text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  full_name := coalesce(new.raw_user_meta_data->>'full_name', 'Fashion Lover');

  -- Insert profile
  insert into public.profiles (id, full_name, role)
  values (new.id, full_name, user_role)
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role;

  -- If user signed up as a designer, create their designer profile
  if user_role = 'designer' then
    insert into public.designer_profiles (
      user_id,
      business_name,
      state,
      city,
      area,
      categories,
      whatsapp
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'business_name', full_name),
      coalesce(new.raw_user_meta_data->>'state', 'Lagos'),
      coalesce(new.raw_user_meta_data->>'city', new.raw_user_meta_data->>'state', 'Lagos'),
      coalesce(new.raw_user_meta_data->>'area', 'Ikeja'),
      case 
        when new.raw_user_meta_data->'categories' is not null 
        then array(select jsonb_array_elements_text(new.raw_user_meta_data->'categories'))
        else array['native_wear', 'ankara']
      end,
      new.raw_user_meta_data->>'whatsapp'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Verify grants
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
