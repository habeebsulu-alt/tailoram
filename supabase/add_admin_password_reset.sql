-- ============================================================
-- TAILORAM: Admin Password Reset Function & Demo Passwords Sync 🔑🇳🇬
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

-- 1. Ensure pgcrypto extension is active for password hashing
create extension if not exists pgcrypto;

-- 2. Create RPC function allowing admins to reset any user's password directly
create or replace function public.admin_reset_user_password(
  target_email text,
  new_password text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  user_record record;
begin
  -- Find user in auth.users
  select id, email into user_record
  from auth.users
  where lower(email) = lower(target_email);

  if not found then
    return json_build_object(
      'success', false,
      'error', 'No user found with email ' || target_email
    );
  end if;

  -- Update encrypted password with bcrypt hash
  update auth.users
  set 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  where id = user_record.id;

  return json_build_object(
    'success', true,
    'email', user_record.email,
    'message', 'Password successfully updated'
  );
end;
$$;

-- Grant execution to anon and authenticated users
grant execute on function public.admin_reset_user_password(text, text) to anon, authenticated, service_role;

-- 3. IMMEDIATELY SET ALL DEMO PASSWORDS TO: Tailoram2026!
update auth.users
set 
  encrypted_password = crypt('Tailoram2026!', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email like '%@demo.tailoram.com';

-- Output confirmation
select email, 'Password set to Tailoram2026!' as status 
from auth.users 
where email like '%@demo.tailoram.com';
