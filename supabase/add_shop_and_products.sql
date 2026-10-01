-- ============================================================
-- TAILORAM: Store Products & Designer Shops Schema 🏬🇳🇬
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

-- 1. Create store_products table
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null check (price >= 0),
  image_url text not null,
  category text not null default 'ready_to_wear',
  sizes text[] default array['M', 'L', 'XL']::text[],
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Add store and gender columns to designer_profiles
alter table public.designer_profiles add column if not exists has_store boolean default true;
alter table public.designer_profiles add column if not exists store_name text;
alter table public.designer_profiles add column if not exists gender_focus text default 'unisex';

-- Update gender focus for demo studios
update public.designer_profiles set gender_focus = 'male' where business_name ilike '%Kola Kuddus%' or business_name ilike '%Seyi Vodi%';
update public.designer_profiles set gender_focus = 'female' where business_name ilike '%Veekee%' or business_name ilike '%Deola Sagoe%';
update public.designer_profiles set gender_focus = 'unisex' where business_name ilike '%Atafo%' or business_name ilike '%Bankole%';

-- 3. Row Level Security policies
alter table public.store_products enable row level security;

drop policy if exists "Store products are viewable by everyone" on public.store_products;
create policy "Store products are viewable by everyone"
  on public.store_products for select
  using (true);

drop policy if exists "Designers can insert their store products" on public.store_products;
create policy "Designers can insert their store products"
  on public.store_products for insert
  with check (
    exists (
      select 1 from public.designer_profiles
      where id = store_products.designer_id and user_id = auth.uid()
    )
  );

drop policy if exists "Designers can update their store products" on public.store_products;
create policy "Designers can update their store products"
  on public.store_products for update
  using (
    exists (
      select 1 from public.designer_profiles
      where id = store_products.designer_id and user_id = auth.uid()
    )
  );

drop policy if exists "Designers can delete their store products" on public.store_products;
create policy "Designers can delete their store products"
  on public.store_products for delete
  using (
    exists (
      select 1 from public.designer_profiles
      where id = store_products.designer_id and user_id = auth.uid()
    )
  );

grant all on public.store_products to anon, authenticated;

-- 4. Enable store for all existing demo designer profiles
update public.designer_profiles
set has_store = true,
    store_name = business_name || ' RTW Collection'
where store_name is null;

-- 5. Seed authentic Nigerian Ready-to-Wear products for demo studios
insert into public.store_products (designer_id, title, description, price, image_url, category, sizes, in_stock)
values
  -- Dele Couture (Lagos)
  (
    '33333333-3333-3333-3333-333333333301',
    'Royal Velvet Embroidered Agbada (3-Piece)',
    'Ready-to-wear hand-stitched 3-piece emerald Agbada with golden chest embroidery, trousers, and inner tunic.',
    85000,
    'https://images.unsplash.com/photo-1572495532056-8583af1cbae0?auto=format&fit=crop&w=800&q=80',
    'agbada_senator',
    array['M', 'L', 'XL', 'XXL']::text[],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'Executive White Senator Native Suit',
    'Crisp wool blend Senator suit with discreet neckline embroidery and tailored cigarette trousers.',
    45000,
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    'agbada_senator',
    array['S', 'M', 'L', 'XL']::text[],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'Hand-embroidered Velvet Fila Cap',
    'Traditional Yoruba Fila cap crafted from rich burgundy velvet with intricate metallic thread.',
    15000,
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    'accessories',
    array['Medium (22")', 'Large (23")']::text[],
    true
  ),

  -- Krown & Kente (Abuja)
  (
    '33333333-3333-3333-3333-333333333302',
    'Golden Corset Owambe Lace Gown',
    'Stunning bespoke French lace mermaid gown with structured boned corset bodice and cape sleeve.',
    120000,
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80',
    'aso_ebi_dresses',
    array['M', 'L']::text[],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'Handwoven Metallic Aso-Oke Auto-Gele',
    'Pre-tied instant luxury Gele headtie woven on traditional Yoruba looms with bronze metallic accents.',
    28000,
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    'accessories',
    array['Standard (Adjustable)']::text[],
    true
  ),

  -- Emeka Bespoke (Port Harcourt)
  (
    '33333333-3333-3333-3333-333333333303',
    'Traditional Red Lion Isiagu Chieftaincy Tunic',
    'Authentic Igbo chieftaincy velvet tunic featuring gold lion head crests and embroidered hemline.',
    60000,
    'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=800&q=80',
    'ready_to_wear',
    array['L', 'XL', 'XXL']::text[],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'Midnight Navy Wool Senator Set',
    'Double-breasted contemporary native Senator with matching fitted trousers.',
    48000,
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    'agbada_senator',
    array['M', 'L', 'XL']::text[],
    true
  ),

  -- Alara Adire Studios (Ibadan)
  (
    '33333333-3333-3333-3333-333333333304',
    'Indigo Adire Silk Kimono Robe',
    'Hand-batiked indigo silk lounger with authentic Abeokuta heritage geometric patterns.',
    38000,
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    'ready_to_wear',
    array['Free Size (S - XL)']::text[],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'Hand-dyed Adire Eleko Fabric (5 Yards)',
    '100% premium cotton fabric hand-painted with cassava starch resist and indigo dye.',
    22000,
    'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&q=80',
    'fabrics',
    array['5 Yards']::text[],
    true
  ),

  -- Zainab Royal Attire (Kano)
  (
    '33333333-3333-3333-3333-333333333305',
    'Royal Babban Riga Embroidered Robe',
    'Magnificent Northern Nigerian Babban Riga in heavyweight damask with intricate neckline handwork.',
    95000,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'ready_to_wear',
    array['L', 'XL']::text[],
    true
  ),

  -- Chidinma Bridal (Enugu)
  (
    '33333333-3333-3333-3333-333333333306',
    'George Fabric Coral Beaded Bridal Wrapper Set',
    'Traditional Igbo double wrapper set embroidered with authentic gold bullion and coral beading.',
    150000,
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    'ready_to_wear',
    array['Full Set (Blouse + Wrappers)']::text[],
    true
  )
on conflict do nothing;
