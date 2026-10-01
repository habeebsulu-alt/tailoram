-- ============================================================
-- TAILORAM: Style Category, Portfolio Rating & Demo Credentials
-- Run this in Supabase SQL Editor to enable Style Categories & Demo Login
-- ============================================================

-- 1. Add category and rating columns to portfolio_items
alter table public.portfolio_items add column if not exists category text;
alter table public.portfolio_items add column if not exists rating numeric default 5.0;

-- 2. Update existing demo portfolio items with categories & realistic ratings
update public.portfolio_items
set category = 'agbada', rating = 5.0
where caption ilike '%agbada%' or caption ilike '%senegalese%' or caption ilike '%boubou%';

update public.portfolio_items
set category = 'aso_ebi', rating = 4.9
where caption ilike '%aso ebi%' or caption ilike '%lace%' or caption ilike '%corset%' or caption ilike '%gele%';

update public.portfolio_items
set category = 'senator', rating = 4.8
where caption ilike '%senator%' or caption ilike '%kaftan%' or caption ilike '%native%';

update public.portfolio_items
set category = 'ankara', rating = 5.0
where caption ilike '%ankara%' or caption ilike '%wax%' or caption ilike '%kente%';

update public.portfolio_items
set category = 'adire', rating = 4.9
where caption ilike '%adire%' or caption ilike '%indigo%' or caption ilike '%tie-dye%';

update public.portfolio_items
set category = 'bridal', rating = 5.0
where caption ilike '%bridal%' or caption ilike '%wedding%' or caption ilike '%george%';

-- Fallback for any items without a category: default to 'agbada' or 'contemporary'
update public.portfolio_items
set category = 'contemporary', rating = 4.9
where category is null;

-- 3. Set standard demo password for all 6 demo designer accounts & client accounts
-- Password: Tailoram2026!
update auth.users
set encrypted_password = crypt('Tailoram2026!', gen_salt('bf'))
where email like '%@demo.tailoram.com';
