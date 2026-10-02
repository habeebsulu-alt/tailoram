# Tailoram - Project Architecture & Operational Memory

> **Tailoram** is Nigeria's Premier Bespoke Fashion Marketplace & Ready-to-Wear (RTW) Platform, connecting clients across all 36 Nigerian states and the diaspora with top master tailors and fashion ateliers (Agbada, Aso Ebi, Senator suits, Ankara, Bridal, Kaftan).

---

## 1. Tech Stack & Environment
- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS, Lucide React icons
- **Language**: TypeScript (`tsconfig.json` strict mode)
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Deployment**: Vercel (`https://tailoram.vercel.app`)
- **Version Control**: Git (`main` branch, tagged `v1.0.0` / `v1`)

---

## 2. Directory Structure & Key Routes
```
Tailoram/
├── app/
│   ├── page.tsx                 # Marketplace Homepage: Hero Slider, EntrySplash, Hub discovery, Filter & Ranked Designers
│   ├── admin/page.tsx           # Master Admin Control Center: Password resets, analytics, order overrides, settings
│   ├── dashboard/page.tsx       # Tailor/Designer Studio: Portfolio upload, bespoke requests, RTW store inventory, reviews
│   ├── designer/[id]/page.tsx   # Public Designer Profile: Bio, ratings, portfolio gallery, WhatsApp link, bespoke booking
│   ├── login/page.tsx           # Clean sign-in page with 1-click quick demo accounts (no developer SQL clutter)
│   ├── signup/page.tsx          # Dual registration (Bespoke Designer studio or Client commission account)
│   ├── shop/page.tsx            # Ready-to-Wear (RTW) Marketplace: In-stock garments, sizing, ordering
│   ├── requests/page.tsx        # Client & Tailor commission orders tracker
│   └── messages/[requestId]/    # Real-time chat & fit consultations for bespoke orders
├── components/
│   ├── Navbar.tsx               # Top header with dynamic role links, platform announcement bar, auth dropdown
│   ├── Footer.tsx               # Clean footer (all user-facing links, admin portal link intentionally omitted)
│   └── EntrySplash.tsx          # Kinetic typography splash ("YOUR ALL IN ONE FASHION PLUG" Oando PLC-inspired)
├── contexts/
│   └── AuthContext.tsx          # Supabase auth + seamless demo account persistence (`tailoram_demo_session`)
├── lib/
│   ├── supabase.ts              # Supabase browser client
│   ├── types.ts                 # Full TypeScript schemas, fashion categories, Nigerian states & geographic hubs
│   ├── analytics.ts             # Day 1 event tracking (`events` table)
│   └── imageCompressor.ts       # Client-side image compression for fast uploads
└── supabase/
    ├── schema.sql               # Base database schema & RLS policies
    ├── seed_demo_data.sql       # Initial seed data for Lagos, Abuja, Port Harcourt, Ibadan, Kano, and Enugu ateliers
    └── add_admin_password_reset.sql # RPC function for admin password management
```

---

## 3. Database Schema & Models
1. **`profiles`**:
   - `id`: UUID (Primary Key, matching `auth.users.id`)
   - `full_name`: Text
   - `role`: `'designer' | 'client' | 'admin'`
   - `created_at`: Timestamptz

2. **`designer_profiles`**:
   - `id`: UUID
   - `user_id`: References `profiles.id`
   - `business_name`, `bio`, `state`, `city`, `area`, `categories` (text array)
   - `whatsapp`, `has_store`, `store_name`, `gender_focus` (`'male' | 'female' | 'unisex'`)
   - `is_verified`, `is_featured`

3. **`portfolio_items`**:
   - `id`, `designer_id`, `media_url`, `media_type` (`'image' | 'video'`), `caption`

4. **`store_products`**:
   - `id`, `designer_id`, `title`, `price`, `category`, `sizes`, `in_stock`, `image_url`, `description`

5. **`requests`**:
   - `id`, `client_id`, `designer_id`, `style_description`, `fabric`, `budget_min`, `budget_max`, `deadline`, `reference_image_url`, `status` (`'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined'`)

6. **`messages`**:
   - `id`, `request_id`, `sender_id`, `content`, `created_at`

7. **`reviews`**:
   - `id`, `designer_id`, `client_id`, `request_id`, `rating` (1–5), `comment`

8. **`events`**:
   - `id`, `event_type`, `user_id`, `designer_id`, `metadata` (JSONB)

9. **`platform_settings`**:
   - `key`: Text (e.g. `'announcement'`, `'maintenance_mode'`, `'user_passwords'`)
   - `value`: JSONB

---

## 4. Authentication & Demo Account System
- **Real Users**: Standard Supabase Email/Password authentication.
- **Demo Users**:
  - `dele.couture@demo.tailoram.com` (Lagos Agbada & Senator master)
  - `maryam.bello@demo.tailoram.com` (Abuja Bridal & Aso Ebi atelier)
  - `emeka.craft@demo.tailoram.com` (Port Harcourt Bespoke craft)
  - `yewande.adire@demo.tailoram.com` (Ibadan Adire & contemporary)
  - `zainab.kaftan@demo.tailoram.com` (Kano Babban Riga & Kaftan)
  - `chidinma.bridal@demo.tailoram.com` (Enugu George & bridal glam)
  - `tunde.balogun@demo.tailoram.com`, `amina.mohammed@demo.tailoram.com`, etc. (Clients)
  - **Preset Password**: `Tailoram2026!`
- **Seamless Fallback**: In `contexts/AuthContext.tsx`, if Supabase returns unhashed credentials, the client falls back to synthetic session persistence (`localStorage.getItem('tailoram_demo_session')`), loading full profiles instantly without throwing errors.
- **Admin Password Reset**: Admins can reset any user password in `/admin`. Changes are saved immediately into `platform_settings.user_passwords` for instant, global recognition.
- **Admin Studio Impersonation (Passwordless Access)**: Admins in `/admin` can click "Login as Designer" on any atelier to instantly assume that designer's session without entering their password. Enables admins to directly modify portfolio photos, upload/delete images, edit RTW store garments, and update studio profiles. Includes an omnipresent top banner with a 1-click "Return to Admin Panel" button.
- **Login UI Rule**: Login page must remain strictly clean and customer-facing. Never expose SQL scripts, migration instructions, or developer debugging text to users.

---

## 5. UI/UX & Design Guidelines
- **Atmosphere**: Nigerian luxury fashion, warm amber gold tones (`#f59e0b`, `brand` palette), dark rich editorial backgrounds.
- **Preloader Splash**: `components/EntrySplash.tsx` animated kinetic typography ("YOUR ALL IN ONE FASHION PLUG" inspired by Oando PLC).
- **Hero CTA Row**:
  - Three single-line, perfectly balanced buttons with `whitespace-nowrap` and matching height (`h-12 sm:h-13`):
    1. `[ 📍 Designers Around Me  Nearby ]`
    2. `[ 🧭 Explore All Designers  {count} ]`
    3. `[ 🛍️ Explore the Shop  RTW ]`
- **Geolocation**: Supports automatic GPS location matching against Nigerian fashion hubs (Lagos, Abuja, Port Harcourt, Ibadan, Kano, Enugu, Kaduna, Benin City, Calabar, Asaba, etc.).
- **Admin Page Security**: `/admin` is protected by passkey (`tailoram` / `tailoram2026`) and role elevation. No public links in the footer or public navigation.
