-- ============================================================
-- TAILORAM: Realistic Nigerian Demo Data Seed Script (Safe) 🇳🇬
-- Paste this script into your Supabase SQL Editor and click RUN
-- ============================================================

-- Ensure the reviews table exists first
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);
drop policy if exists "Clients can submit reviews" on public.reviews;
create policy "Clients can submit reviews" on public.reviews for insert with check (auth.uid() = client_id);
drop policy if exists "Clients can update their own reviews" on public.reviews;
create policy "Clients can update their own reviews" on public.reviews for update using (auth.uid() = client_id);
drop policy if exists "Clients can delete their own reviews" on public.reviews;
create policy "Clients can delete their own reviews" on public.reviews for delete using (auth.uid() = client_id);
grant all on public.reviews to anon, authenticated;

-- ============================================================
-- 1. SEED AUTH USERS & PROFILES
-- ============================================================

-- Insert designers into auth.users
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values 
  ('11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'dele.couture@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Bamidele Adeleke","role":"designer"}', now(), now()),
  ('11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'maryam.bello@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Hajiya Maryam Bello","role":"designer"}', now(), now()),
  ('11111111-1111-1111-1111-111111111103', 'authenticated', 'authenticated', 'emeka.craft@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Chukwuemeka Okoli","role":"designer"}', now(), now()),
  ('11111111-1111-1111-1111-111111111104', 'authenticated', 'authenticated', 'yewande.adire@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Yewande Salami","role":"designer"}', now(), now()),
  ('11111111-1111-1111-1111-111111111105', 'authenticated', 'authenticated', 'zainab.kaftan@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Zainab Danjuma","role":"designer"}', now(), now()),
  ('11111111-1111-1111-1111-111111111106', 'authenticated', 'authenticated', 'chidinma.bridal@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Chidinma Nnamani","role":"designer"}', now(), now())
on conflict (id) do nothing;

-- Insert clients into auth.users
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values 
  ('22222222-2222-2222-2222-222222222201', 'authenticated', 'authenticated', 'tunde.balogun@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Tunde Balogun","role":"client"}', now(), now()),
  ('22222222-2222-2222-2222-222222222202', 'authenticated', 'authenticated', 'amina.mohammed@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Amina Mohammed","role":"client"}', now(), now()),
  ('22222222-2222-2222-2222-222222222203', 'authenticated', 'authenticated', 'ngozi.eze@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Ngozi Eze","role":"client"}', now(), now()),
  ('22222222-2222-2222-2222-222222222204', 'authenticated', 'authenticated', 'femi.adeyemi@demo.tailoram.com', '', now(), '{"provider":"email"}', '{"full_name":"Femi Adeyemi","role":"client"}', now(), now())
on conflict (id) do nothing;

-- Ensure profiles exist
insert into public.profiles (id, full_name, role)
values 
  ('11111111-1111-1111-1111-111111111101', 'Bamidele Adeleke', 'designer'),
  ('11111111-1111-1111-1111-111111111102', 'Hajiya Maryam Bello', 'designer'),
  ('11111111-1111-1111-1111-111111111103', 'Chukwuemeka Okoli', 'designer'),
  ('11111111-1111-1111-1111-111111111104', 'Yewande Salami', 'designer'),
  ('11111111-1111-1111-1111-111111111105', 'Zainab Danjuma', 'designer'),
  ('11111111-1111-1111-1111-111111111106', 'Chidinma Nnamani', 'designer'),
  ('22222222-2222-2222-2222-222222222201', 'Tunde Balogun', 'client'),
  ('22222222-2222-2222-2222-222222222202', 'Amina Mohammed', 'client'),
  ('22222222-2222-2222-2222-222222222203', 'Ngozi Eze', 'client'),
  ('22222222-2222-2222-2222-222222222204', 'Femi Adeyemi', 'client')
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

-- ============================================================
-- 2. SEED DESIGNER PROFILES (FORCE EXACT MATCHING IDs)
-- ============================================================

insert into public.designer_profiles (id, user_id, business_name, bio, state, city, area, categories, whatsapp)
values 
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Dele Couture & Royal Agbada', 'Award-winning bespoke master tailor in Victoria Island. Specializing in luxury 3-piece and 5-piece Agbadas with hand-embroidered crests, Senator suits, and sharp corporate tuxedos. 7-day turnaround with VIP fitting sessions.', 'Lagos', 'Lagos', 'Victoria Island', array['agbada', 'native_wear', 'corporate'], '+2348031234567'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111102', 'Krown & Kente Aso Ebi Studio', 'Abuja premier bridal and owambe glamour house. Perfecting structured corset bodices, French lace, and embellished velvet styles. Trusted by brides, bridesmaids, and diplomats in the FCT.', 'Abuja (FCT)', 'Abuja', 'Wuse II', array['aso_ebi', 'bridal', 'ankara'], '+2348029876543'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 'Emeka Bespoke Senator & Craft', 'Precision cutting and crisp tailoring in the heart of Port Harcourt. Renowned for custom Senator wear in Italian cashmere, linen, and Guinea brocade. Accurate measurements guaranteed.', 'Rivers (Port Harcourt)', 'Port Harcourt', 'GRA Phase 1 & 2', array['native_wear', 'corporate', 'ready_to_wear'], '+2348053334455'),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111104', 'Alara Adire & Contemporary Ankara', 'Ibadan vibrant atelier celebrating indigenous Yoruba adire and wax prints. Custom wide-leg sets, kimonos, jumpsuits, and casual evening wear designed for the modern fashion enthusiast.', 'Oyo (Ibadan)', 'Ibadan', 'Bodija', array['ankara', 'casual', 'ready_to_wear'], '+2348074445566'),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111105', 'Zainab Royal Senegalese & Kaftan', 'High-end Northern Nigerian tailoring in Kano. Exquisite Babban Riga, Senegalese gowns, and royal Kaftans crafted in pure Shadda and bazin riche fabrics.', 'Kano', 'Kano', 'Nassarawa GRA', array['agbada', 'native_wear', 'bridal'], '+2348085556677'),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111106', 'Chidinma Bridal & Owambe Glam', 'Enugu premier bespoke bridal designer. Specializing in traditional George wrappers, Igbo bridal attire, corset evening dresses, and bespoke lace styling.', 'Enugu', 'Enugu', 'Independence Layout', array['bridal', 'aso_ebi', 'native_wear'], '+2348096667788')
on conflict (user_id) do update set 
  id = excluded.id,
  business_name = excluded.business_name,
  bio = excluded.bio,
  state = excluded.state,
  city = excluded.city,
  area = excluded.area,
  categories = excluded.categories,
  whatsapp = excluded.whatsapp;

-- Also update by user_id in case IDs need re-pointing
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333301' where user_id = '11111111-1111-1111-1111-111111111101';
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333302' where user_id = '11111111-1111-1111-1111-111111111102';
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333303' where user_id = '11111111-1111-1111-1111-111111111103';
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333304' where user_id = '11111111-1111-1111-1111-111111111104';
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333305' where user_id = '11111111-1111-1111-1111-111111111105';
update public.designer_profiles set id = '33333333-3333-3333-3333-333333333306' where user_id = '11111111-1111-1111-1111-111111111106';

-- ============================================================
-- 3. SEED PORTFOLIO ITEMS
-- ============================================================

-- Clean existing demo items first to prevent duplicates
delete from public.portfolio_items where designer_id in (
  '33333333-3333-3333-3333-333333333301',
  '33333333-3333-3333-3333-333333333302',
  '33333333-3333-3333-3333-333333333303',
  '33333333-3333-3333-3333-333333333304',
  '33333333-3333-3333-3333-333333333305',
  '33333333-3333-3333-3333-333333333306'
);

insert into public.portfolio_items (designer_id, media_url, media_type, caption)
values
  -- Dele Couture (Lagos) - Royal Agbada & Senator Suits
  ('33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80', 'image', 'Grand Royal Blue Agbada with golden thread embroidery'),
  ('33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80', 'image', 'Crisp White Senator Suit with tailored chest detail on Black African gentleman'),
  ('33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1621784563330-caee0b138a00?auto=format&fit=crop&w=800&q=80', 'image', 'Midnight Black Bespoke Tuxedo on Black African model'),

  -- Krown & Kente (Abuja) - Owambe Aso Ebi & Bridal Glam + Video Reel
  ('33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80', 'image', 'Emerald Green Beaded Corset Aso Ebi with French lace for Owambe wedding'),
  ('33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80', 'image', 'Luxury Rose Gold Wedding Aso Ebi with matching Gele on Black African woman'),
  ('33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=800&q=80', 'image', 'Contemporary Ankara gown with matching headwrap on Black model'),
  ('33333333-3333-3333-3333-333333333302', 'https://assets.mixkit.co/videos/preview/mixkit-african-woman-in-a-yellow-dress-dancing-40748-large.mp4', 'video', 'Movement showcase: Yellow Flowing Reception Gown video clip'),

  -- Emeka Bespoke (Port Harcourt) - Cashmere Senator & Native Craft
  ('33333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80', 'image', 'Navy Blue Double-ply Cashmere Senator Wear on Black model'),
  ('33333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80', 'image', 'Charcoal Grey Hand-Stitched Agbada with geometric embroidery'),

  -- Alara Adire (Ibadan) - Yoruba Adire Eleko & Wax Prints
  ('33333333-3333-3333-3333-333333333304', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', 'image', 'Hand-dyed Indigo Adire Eleko 2-piece lounge set'),
  ('33333333-3333-3333-3333-333333333304', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80', 'image', 'Tiered Ankara Maxi dress on Black African fashion model'),

  -- Zainab Royal Kaftan (Kano) - Northern Shadda Babban Riga
  ('33333333-3333-3333-3333-333333333305', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', 'image', 'Regal Bronze Shadda Babban Riga with silver embroidery on Black African model'),
  ('33333333-3333-3333-3333-333333333305', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=80', 'image', 'Modern Senegalese Boubou with embellished neckline on Black African woman'),

  -- Chidinma Bridal (Enugu) - Igbo Traditional George & Owambe + Video Reel
  ('33333333-3333-3333-3333-333333333306', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80', 'image', 'Custom Crimson George traditional wedding ensemble on Black bride'),
  ('33333333-3333-3333-3333-333333333306', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80', 'image', 'Champagne Gold Mermaid Aso Ebi gown with beaded lace train'),
  ('33333333-3333-3333-3333-333333333306', 'https://assets.mixkit.co/videos/preview/mixkit-young-black-woman-modeling-in-a-studio-41153-large.mp4', 'video', 'Bridal runway test: Modeling bespoke gown silhouette');

-- ============================================================
-- 4. SEED REQUESTS
-- ============================================================

delete from public.messages where request_id in (
  '44444444-4444-4444-4444-444444444401',
  '44444444-4444-4444-4444-444444444402',
  '44444444-4444-4444-4444-444444444403',
  '44444444-4444-4444-4444-444444444404'
);

delete from public.requests where id in (
  '44444444-4444-4444-4444-444444444401',
  '44444444-4444-4444-4444-444444444402',
  '44444444-4444-4444-4444-444444444403',
  '44444444-4444-4444-4444-444444444404'
);

insert into public.requests (id, client_id, designer_id, style_description, fabric, budget_min, budget_max, deadline, status)
values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 'Need a 3-piece Royal Agbada for my sister traditional wedding. Navy blue with gold threadwork on the neckline and matching fila.', 'Guinea Brocade', 65000, 95000, current_date + interval '14 days', 'accepted'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', 'Corset Aso Ebi gown in burnt orange French lace with structured off-shoulder sleeves for an upcoming Abuja wedding.', 'French Lace & Silk', 50000, 80000, current_date + interval '10 days', 'completed'),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333303', 'Two pairs of sharp Senator suits in wine red and black for church dedication and corporate meeting.', 'Italian Cashmere', 40000, 60000, current_date + interval '7 days', 'completed'),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', 'Custom tailored Adire shirt and trousers set for weekend brunch and casual networking event.', 'Hand-dyed Adire', 25000, 35000, current_date + interval '5 days', 'pending');

-- ============================================================
-- 5. SEED CLIENT RATINGS & REVIEWS
-- ============================================================

delete from public.reviews where designer_id in (
  '33333333-3333-3333-3333-333333333301',
  '33333333-3333-3333-3333-333333333302',
  '33333333-3333-3333-3333-333333333303',
  '33333333-3333-3333-3333-333333333304',
  '33333333-3333-3333-3333-333333333305',
  '33333333-3333-3333-3333-333333333306'
);

insert into public.reviews (designer_id, client_id, request_id, rating, comment, created_at)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444401', 5, 'Dele is unquestionably one of the best tailors in Lagos! The Agbada was 100% true to measurement, delivered 2 days before the wedding, and the embroidery was pure royalty. 10/10!', now() - interval '2 days'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', null, 5, 'Cleanest finishing I have experienced in Nigeria. He even handled the fabric sourcing for me. Will be commissioning all my suits here.', now() - interval '5 days'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', null, 5, 'Sharp senator fit! No adjustments needed. Everyone at the event kept asking who made my outfit.', now() - interval '12 days'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202', null, 5, 'Fast delivery, responsive on WhatsApp, and top notch craftsmanship. Highly recommended.', now() - interval '20 days'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', '44444444-4444-4444-4444-444444444402', 5, 'Hajiya Maryam saved my weekend! The corset snatch was perfection without hurting at all. The lace beading was exquisite.', now() - interval '3 days'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222203', null, 5, 'Best Aso Ebi tailor in Wuse II! Super professional and she understands modern cuts.', now() - interval '8 days'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', null, 4, 'Very lovely dress for my wife. Took 1 extra day for the zipper adjustment, but overall quality was outstanding.', now() - interval '15 days'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', '44444444-4444-4444-4444-444444444403', 5, 'Very dependable tailor in Port Harcourt. The Italian cashmere suits came out crisp, pressed, and perfectly proportioned.', now() - interval '4 days'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222204', null, 4, 'Good quality stitching and very honest pricing. Will definitely recommend him for guys wanting sharp senator wear.', now() - interval '18 days'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', null, 5, 'Her adire designs are pure art! The print patterns are authentic and the contemporary cut is so stylish. Got compliments all day in Lagos.', now() - interval '6 days'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222201', null, 5, 'Super neat seams and breathable cotton fabric. Turnaround was just 5 days!', now() - interval '11 days'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222201', null, 5, 'The embroidery on the Babban Riga is breathtaking. Authentic Northern tailoring at its absolute best.', now() - interval '7 days'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222203', null, 5, 'Chidinma made my traditional wedding George outfit and I felt like a true Igbo queen. Her hand-beaded lace is unmatched!', now() - interval '9 days'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222202', null, 5, 'Punctual, graceful, and exceptionally skilled. Enugu proudest designer!', now() - interval '14 days');

-- ============================================================
-- 6. SEED SAMPLE IN-APP REALTIME CHAT
-- ============================================================

insert into public.messages (request_id, sender_id, content, created_at)
values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', 'Hello Bro Dele! I just submitted my request for the Royal Agbada. Did you see the note about the golden threadwork?', now() - interval '2 hours'),
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'Good afternoon Chief Tunde! Yes, I received it. The Navy blue Guinea brocade with gold embroidery will look magnificent. I have accepted your request.', now() - interval '1 hour 45 minutes'),
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', 'Awesome! When should I drop by your VI studio for measurement confirmation?', now() - interval '1 hour 30 minutes'),
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'You can come in anytime tomorrow between 11am and 4pm. See you soon!', now() - interval '1 hour 15 minutes');
