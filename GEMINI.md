# Tailoram - Project Architecture & Operational Memory

> **Tailoram** is Nigeria's Premier Bespoke Fashion Marketplace & Ready-to-Wear (RTW) Platform, connecting clients across all 36 Nigerian states and the diaspora with top master tailors and fashion designers (Agbada, Aso Ebi, Senator suits, Ankara, Bridal, Kaftan).

---

## 1. Tech Stack & Environment
- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS, Lucide React icons
- **Language**: TypeScript (`tsconfig.json` strict mode)
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Deployment**: Vercel (Primary Domain: `https://tailoram.com`, Fallback: `https://tailoram.vercel.app`)
- **Version Control**: Git (`main` branch, tagged `v1.0.0` / `v1`)

---

## 2. Directory Structure & Key Routes
```
Tailoram/
├── app/
│   ├── page.tsx                 # Marketplace Homepage: Hero Slider, EntrySplash, Hub discovery, Filter & Ranked Designers
│   ├── entrypoint/page.tsx      # Master Admin Control Center: Password resets, analytics, order overrides, settings
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
│   ├── MobileBottomNav.tsx      # Native Android-style mobile bottom navigation bar (Explore, Shop, Orders, Studio)
│   ├── AndroidInstallPrompt.tsx # Smart 1-tap Android install prompt & home screen banner
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
    ├── seed_demo_data.sql       # Initial seed data for Lagos, Abuja, Port Harcourt, Ibadan, Kano, and Enugu designers
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
   - `key`: Text (e.g. `'announcement'`, `'maintenance_mode'`, `'user_passwords'`, `'designer_ratings'`)
   - `value`: JSONB

---

## 4. Authentication & Demo Account System
- **Real Users**: Standard Supabase Email/Password authentication.
- **Demo Users**:
  - `dele.couture@demo.tailoram.com` (Lagos Agbada & Senator master)
  - `maryam.bello@demo.tailoram.com` (Abuja Bridal & Aso Ebi studio)
  - `emeka.craft@demo.tailoram.com` (Port Harcourt Bespoke craft)
  - `yewande.adire@demo.tailoram.com` (Ibadan Adire & contemporary)
  - `zainab.kaftan@demo.tailoram.com` (Kano Babban Riga & Kaftan)
  - `chidinma.bridal@demo.tailoram.com` (Enugu George & bridal glam)
  - `tunde.balogun@demo.tailoram.com`, `amina.mohammed@demo.tailoram.com`, etc. (Clients)
  - **Preset Password**: `Tailoram2026!`
- **Seamless Fallback**: In `contexts/AuthContext.tsx`, if Supabase returns unhashed credentials, the client falls back to synthetic session persistence (`localStorage.getItem('tailoram_demo_session')`), loading full profiles instantly without throwing errors.
- **Admin Password Reset**: Admins can reset any user password in `/entrypoint`. Changes are saved immediately into `platform_settings.user_passwords` for instant, global recognition.
- **Admin Studio Impersonation (Passwordless Access)**: Admins in `/entrypoint` can click "Login as Designer" on any designer to instantly assume that designer's session without entering their password. Enables admins to directly modify portfolio photos, upload/delete images, edit RTW store garments, and update studio profiles. Includes an omnipresent top banner with a 1-click "Return to Admin Panel" button.
- **Admin Designer Rating Override**: Admins in `/entrypoint` can manually override any designer's star rating (1.0 to 5.0) and displayed review count. Changes persist globally in `platform_settings.designer_ratings` and locally in `localStorage` (`tailoram_designer_ratings`). The marketplace directory, public profile, and studio dashboard compute effective ratings using `computeEffectiveRating`, dynamically adjusting ranking scores and display badges. Admins can revert back to natural client reviews at any time.
- **Admin Action Dual-Layer Persistence**: All admin interventions in `/entrypoint` (changing user roles e.g. downgrading designer to client, toggling verification/featured/store flags, overriding order statuses, updating RTW product stock, or deleting profiles/reviews) persist reliably across page refreshes via `lib/adminManager.ts`. Changes synchronize to Supabase `platform_settings` (keys: `user_roles`, `designer_overrides`, `deleted_user_profiles`, `deleted_designer_profiles`, `product_overrides`, `deleted_products`, `deleted_reviews`) and local storage, bypassing Row-Level Security client restrictions and ensuring immediate, permanent updates across the entire marketplace.
- **Login UI Rule**: Login page must remain strictly clean and customer-facing. Never expose SQL scripts, migration instructions, or developer debugging text to users.

---

## 5. UI/UX & Design Guidelines
- **Atmosphere**: Nigerian luxury fashion, warm amber gold tones (`#f59e0b`, `brand` palette), dark rich editorial backgrounds.
- **Preloader Splash**: `components/EntrySplash.tsx` animated kinetic typography ("YOUR ALL IN ONE FASHION PLUG" inspired by Oando PLC).
- **Hero CTA Row**:
  - Three single-line, perfectly balanced buttons with `whitespace-nowrap` and matching height (`h-12 sm:h-13`):
    1. `[ 📍 Designers Around Me  Nearby ]`
    2. `[ 🧭 Explore All Designers ]`
    3. `[ 🛍️ Explore the Shop  RTW ]`
- **Geolocation**: Supports automatic GPS location matching against Nigerian fashion hubs (Lagos, Abuja, Port Harcourt, Ibadan, Kano, Enugu, Kaduna, Benin City, Calabar, Asaba, etc.).
- **Admin Page Security**: Dedicated control center route `/entrypoint` protected by administrative passkey `Energy#123`. No public links in the footer or public navigation.

---

## 6. Email Notification System & Gateway Architecture
- **Central Module**: `lib/emailNotifications.ts`
- **Supported Providers**: Resend API (`api.resend.com`), SendGrid, Postmark, Custom SMTP, and Simulated Mode (zero-config, logs directly to local audit trail).
- **Admin Control Center**: Dedicated tab (`/entrypoint` -> Email Settings) and Platform Settings quick card:
  - Master toggle to enable/disable emails platform-wide.
  - Delivery provider selector, custom sender name & sender email address, provider API key input.
  - Granular event toggles:
    - `notify_on_new_request`: Notifies designer when a client commissions custom attire.
    - `notify_on_quote_received`: Notifies client when designer submits official quote and timeline.
    - `notify_on_deposit_paid`: Notifies designer when 40% initial commitment deposit is paid.
    - `notify_on_order_ready`: Notifies client when garment is tailored and ready for balance.
    - `notify_on_new_message`: Notifies recipient on new chat message in consultation thread.
    - `notify_on_welcome`: Welcomes new fashion designers and clients upon signup with direct links to studio or shop.
  - Interactive test email dispatcher with instant status feedback (including Welcome template).
  - Live sent email audit and telemetry log table.
- **Persistence**: Dual-layer architecture storing in Supabase `platform_settings` (`key: 'email_settings'`) with local storage fallback (`tailoram_email_settings` and `tailoram_email_logs`).

---

## 7. Web Push & In-App Notification Center
- **Push Service Worker**: `public/sw.js` (background push event listener, vibration `[200, 100, 200]`, tap-to-focus on studio dashboard, and rich hero image banner support via `options.image = data.image`).
- **Client Manager**: `lib/pushNotifications.ts` (`isPushSupported`, `requestPushPermission`, `sendPushNotification`, `registerServiceWorker`, `sendAdminPushBroadcast`, `getAdminPushBroadcasts`, `deleteAdminPushBroadcast`).
- **Admin Push Broadcast Center (`/entrypoint` -> Push Broadcasts tab)**:
  - Broadcast push composer targeting `All Users`, `Master Designers`, or `Clients`.
  - Supports custom notification title, body, destination action link, and **rich image banners**.
  - Built-in 1-click Nigerian couture photo presets (Agbada, Aso Ebi, Senator suits, Adire, Bridal George).
  - Live realistic device simulation preview (System push notification shade mockup + in-app lightbox card).
  - Instant 1-click "Test on My Device" trigger for verification on the admin's personal screen.
  - Telemetry log of past broadcasts with thumbnail preview and deletion controls.
- **Dashboard & Client In-App Notification Center**:
  - Bell indicator button with animated unread badge counter in `/dashboard` header and announcements in `/requests`.
  - Interactive notification popover menu itemizing new bespoke commissions, 40% initial commitment deposit notices, 60% final balance settlements, payout setup reminders, new ratings/reviews, welcome greetings, and official rich image broadcasts.
  - "Mark all as read" control, persistence in `localStorage` (`tailoram_read_notifications`).
  - Mobile Push Quick-Opt-in bar: Prompts designers on mobile browsers to enable push notifications directly on their device screen with device-specific instructions (iOS PWA Home Screen instructions vs Android 1-click browser opt-in).

---

## 7. Paystack Subaccounts & Non-Custodial Split Payments
- **Central Modules**: `lib/paystack.ts`, `lib/payments.ts`, `app/api/paystack/resolve/route.ts`, `app/api/paystack/subaccount/route.ts`, `app/api/webhooks/paystack/route.ts`.
- **Database Tables**:
  - `transactions`: Ledger recording `order_id`, `client_id`, `designer_id`, `gross_amount`, `commission_rate`, `platform_commission_amount`, `designer_net_amount`, `payment_stage` (`deposit` | `balance`), `status` (`pending` | `settled`), `paystack_reference`, `receipt_url`.
  - `designer_profiles`: Extended with `bank_name`, `bank_code`, `account_number`, `account_name`, `subaccount_code`, `payout_verified`.
  - `platform_settings`: Key `'commission_settings'` with configurable commission percentage (default 10%), fee bearer (`'account'`), and settlement schedule.
- **Designer Onboarding & NUBAN Verification**:
  - Dedicated "Payout Details" tab in `/dashboard`.
  - Verified across 20+ Nigerian commercial banks and digital banks (GTBank, Access, Zenith, Kuda, OPay, PalmPay, Moniepoint, etc.).
  - Resolves account name via Paystack NUBAN resolve API (`/api/paystack/resolve`).
  - Automatically generates Paystack Subaccount (`percentage_charge: commissionRate`) with fallback sandbox code (`ACCT_TLR_...`).
  - Gating: Designers cannot send quotes or accept bespoke orders until payout details are verified.
- **Transaction Split**:
  - Both 40% initial commitment deposit and 60% completion balance are split independently using the designer's `subaccount_code`.
  - `bearer: 'account'` guarantees the platform absorbs payment processing fees, providing designers with clean, predictable take-home payouts.
- **Designer Wallet & Earnings View**:
  - Dedicated "Wallet & Earnings" tab in `/dashboard`.
  - Displays pending payout balance, settled balance, total net take-home earnings, and gross volume processed.
  - Transparent itemized transaction table showing gross paid, commission rate %, platform fee deducted, and net earned.
- **Client Payment History**:
  - Tab in `/requests` showing order title, payment stage (Deposit / Balance), gross amount paid, and direct links to Paystack payment receipts.
  - Platform commission and designer net payouts remain completely confidential.
- **CBN Regulatory Compliance**:
  - Strictly non-custodial: Client funds are never held or pooled in a central marketplace account. Direct Paystack split payment ensures immediate routing to the artisan's subaccount and commercial bank.

---

## 8. Mobile Architecture & Android App Foundation
- **Web App Manifest (`public/manifest.json`)**: Configured for Android (`id: "com.tailoram.app"`), full-screen standalone display (`display_override: ["standalone", "minimal-ui"]`), portrait orientation, and shortcuts (Explore Designers, RTW Shop, Custom Orders, Studio).
- **High-Res Adaptive Icons**: `public/icons/icon-192.png`, `public/icons/icon-512.png`, and `public/icons/icon-maskable-512.png` with safe-zone margin for Pixel, Samsung One UI, and Xiaomi launchers.
- **Mobile Bottom Navigation (`components/MobileBottomNav.tsx`)**: Ergonomic, native Android-style bottom tab bar (Explore, RTW Shop, Orders, Studio/Profile) with active state indicators and role-aware tabs.
- **Smart Android Install Prompt (`components/AndroidInstallPrompt.tsx`)**: Captures native `beforeinstallprompt` event and presents a luxury dark & gold 1-tap installation banner and manual Chrome guide.
- **Android App Links & Play Store TWA (`public/.well-known/assetlinks.json`)**: Digital Asset Links template for opening `tailoram.com` directly in the native Android app shell.
- **Capacitor Mobile Bridge (`capacitor.config.ts`)**: Pre-configured with `appId: 'com.tailoram.app'` and `server.url: 'https://tailoram.com'`, enabling instant zero-rebuild over-the-air updates whenever Vercel deploys.


