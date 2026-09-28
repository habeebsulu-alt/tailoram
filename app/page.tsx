'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Scissors,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';

export default function HomePage() {
  const { user, profile, designerProfile } = useAuth();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbDetails, setDbDetails] = useState('');

  // Phase 1 verification: test Supabase live connection
  useEffect(() => {
    async function testConnection() {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (error) {
          setDbStatus('error');
          setDbDetails(error.message);
        } else {
          setDbStatus('connected');
          setDbDetails(`Live connection verified! ${count ?? 0} profiles in database.`);
        }
      } catch (err: any) {
        setDbStatus('error');
        setDbDetails(err.message || 'Connection failed');
      }
    }

    testConnection();
  }, []);

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-100/60 via-lagos-cream to-lagos-cream pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-stone-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-brand-800 text-xs font-semibold tracking-wide shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-lagos-green animate-pulse" />
            Lagos, Nigeria&apos;s Bespoke Fashion Network
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-lagos-dark tracking-tight font-serif leading-tight">
            Connect with Exceptional <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-600 to-amber-600">
              Lagos Fashion Designers
            </span>
          </h1>

          <p className="text-base sm:text-lg text-stone-700 max-w-2xl mx-auto leading-relaxed">
            From bespoke Owambe Aso Ebi and sharp Senator suits to contemporary Ankara pieces. Find trusted tailors in your neighborhood, view their portfolios, and send direct custom requests.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              profile?.role === 'designer' ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all"
                >
                  <Scissors className="w-4 h-4" />
                  Go to Designer Dashboard
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="px-4 py-2 bg-white rounded-xl border border-stone-200 text-sm font-medium text-stone-700">
                    Logged in as Client: <span className="font-bold text-brand-600">{profile?.full_name}</span>
                  </div>
                </div>
              )
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-stone-800 font-semibold text-sm border border-stone-300 hover:bg-stone-50 transition-all"
                >
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

        </div>
      </section>

      {/* Phase 1 Verification & Status Card */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Phase 1 Verification
              </span>
              <h2 className="text-xl font-bold text-lagos-dark">
                Setup, Supabase Database &amp; Auth
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus === 'checking' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Connecting...
                </span>
              )}
              {dbStatus === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Supabase Live
                </span>
              )}
              {dbStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Connection Error
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Supabase Status */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
              <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                Supabase Postgres
              </div>
              <p className="text-sm font-bold text-lagos-dark capitalize">
                {dbStatus === 'connected' ? 'Connected & Verified' : dbStatus}
              </p>
              <p className="text-xs text-stone-500 truncate" title={dbDetails}>
                {dbDetails || 'Testing database schema...'}
              </p>
            </div>

            {/* Auth Session Status */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
              <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold">
                <Users className="w-4 h-4 text-brand-600" />
                Current User Session
              </div>
              <p className="text-sm font-bold text-lagos-dark">
                {user ? profile?.full_name || user.email : 'No active session (Guest)'}
              </p>
              <p className="text-xs text-stone-500">
                {user ? `Role: ${profile?.role || 'loading...'}` : 'Try signing up below'}
              </p>
            </div>

            {/* Storage Buckets */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
              <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold">
                <Zap className="w-4 h-4 text-brand-600" />
                Storage Buckets
              </div>
              <p className="text-sm font-bold text-lagos-dark">
                `portfolio` &amp; `requests`
              </p>
              <p className="text-xs text-stone-500">
                Client-side WebP compression ready
              </p>
            </div>
          </div>

          {/* User Details if Logged In */}
          {user && (
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-200">
              <h3 className="text-sm font-bold text-brand-900 mb-1">
                Active Profile Session
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-800">
                <div><span className="font-semibold">User ID:</span> {user.id}</div>
                <div><span className="font-semibold">Email:</span> {user.email}</div>
                <div><span className="font-semibold">Role:</span> {profile?.role}</div>
                {designerProfile && (
                  <div><span className="font-semibold">Brand:</span> {designerProfile.business_name} ({designerProfile.area})</div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h3 className="text-2xl font-bold text-lagos-dark font-serif">
            Built Specifically for Lagos Tailoring
          </h3>
          <p className="text-sm text-stone-600 mt-2">
            A social marketplace designed for real Nigerian fashion creators and fabric lovers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-lg text-lagos-dark">Neighborhood Discovery</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              Find tailors nearby in Ikeja, Lekki, Surulere, Yaba, or VI to easily drop off materials and do fitting sessions without spending hours in Lagos traffic.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-lg text-lagos-dark">Visual Portfolios</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              See authentic photos and short videos of outfits crafted by designers. Mobile-optimized and lightweight so it loads fast on phone data.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-lg text-lagos-dark">Structured Requests</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              Never get mismatched styles again. Submit your style description, fabric details, budget range in Naira, and deadline for the designer to review.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
