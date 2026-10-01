# Tailoram - Nigerian Bespoke Fashion Marketplace 🇳🇬

A social marketplace connecting bespoke tailors and fashion designers across Nigeria (Lagos, Abuja FCT, Port Harcourt, Ibadan, Kano, and all 36 states) with clients who want custom clothes made.

## ✨ Features
- **Nationwide Coverage**: Discover tailors across all 36 Nigerian states and FCT Abuja with local neighborhood filtering (Ikeja, Lekki, Wuse II, Port Harcourt GRA, Bodija, etc.).
- **Tailor Ranking & Rating System**: Top tailors ranked by verified client feedback, ratings, and order activity.
- **Portfolios with Mobile Compression**: Fast loading on Nigerian mobile data with automatic client-side WebP compression.
- **Structured Outfit Requests**: Clients submit garment details, budget in Naira (₦), fabric, deadline, and reference style photos.
- **Designer Studio Dashboard**: Tailors manage incoming orders (Accept, Decline, Complete) and showcase portfolio creations.
- **Realtime In-App Chat**: Direct messaging between client and designer powered by Supabase Realtime.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Storage, Realtime)
- **Deployment**: Vercel

## 🚀 Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
