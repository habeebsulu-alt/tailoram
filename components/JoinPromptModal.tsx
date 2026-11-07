'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Scissors,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  User,
  Users,
  Coins,
  ChevronRight,
  LogIn,
} from 'lucide-react';

export default function JoinPromptModal() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'designer'>('client');

  useEffect(() => {
    // Never show to signed-in users or while auth is resolving
    if (loading || user) return;
    if (typeof window === 'undefined') return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('tailoram_join_prompt_dismissed');
    if (isDismissed === 'true') return;

    let timer: NodeJS.Timeout | null = null;
    let scrollTriggered = false;

    const handleScroll = () => {
      // Trigger when user scrolls past initial viewport (e.g. 100px)
      if (window.scrollY > 80 && !scrollTriggered) {
        scrollTriggered = true;
        // Wait exactly 7 seconds of scrolling engagement
        timer = setTimeout(() => {
          const alreadyDismissed = sessionStorage.getItem('tailoram_join_prompt_dismissed');
          if (!user && alreadyDismissed !== 'true') {
            setIsOpen(true);
          }
        }, 7000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [user, loading]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tailoram_join_prompt_dismissed', 'true');
    }
    setIsOpen(false);
  };

  // If user is logged in, don't render anything
  if (user || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div
        className="w-full max-w-xl bg-stone-950 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100 relative animate-in zoom-in-95 duration-200"
        style={{ maxHeight: '92vh' }}
      >
        {/* Subtle decorative gold light glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-600/10 blur-3xl pointer-events-none rounded-full" />

        {/* Top Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between gap-4 border-b border-stone-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Welcome to Tailoram
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                Join Nigeria&apos;s Premier Fashion Marketplace
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Continue browsing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Role Selector Tabs */}
        <div className="px-5 sm:px-6 pt-4 relative z-10">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-stone-900 border border-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab('client')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'client'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md scale-101'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>For Fashion Clients</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('designer')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'designer'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md scale-101'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Scissors className="w-4 h-4 -rotate-45" />
              <span>For Tailors &amp; Designers</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 relative z-10">
          {activeTab === 'client' ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Commission Bespoke Attire Directly from Master Tailors
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Connect with verified fashion designers in Lagos, Abuja, and nationwide for your Agbada, Senator suits, Ankara, Aso Ebi, and wedding glam.
                </p>
              </div>

              {/* Value Proposition List */}
              <div className="space-y-2.5 bg-stone-900/70 border border-stone-800/80 p-3.5 sm:p-4 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Verified Artisans:</strong> Discover top tailors vetted for stitch quality, craftsmanship, and verified portfolio photos.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Secure 40% Deposit Protection:</strong> Pay only 40% commitment deposit to begin fabric cutting; pay the balance when your outfit is tailored.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Any Style or Inspo Photo:</strong> Upload your photo or choose from Ready-to-Wear (RTW) in-stock collections.
                  </p>
                </div>
              </div>

              {/* Client Action CTA */}
              <div className="space-y-2 pt-1">
                <Link
                  href="/signup?role=client"
                  onClick={handleDismiss}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4 text-stone-950" />
                  <span>Join as a Client &amp; Commission Attire</span>
                  <ArrowRight className="w-4 h-4 text-stone-950" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Grow Your Atelier &amp; Receive Inquiries Worldwide
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Put your studio on Nigeria&apos;s premier bespoke fashion marketplace. Accept custom orders from clients in all 36 states and the UK/US diaspora.
                </p>
              </div>

              {/* Designer Value Proposition List */}
              <div className="space-y-2.5 bg-stone-900/70 border border-stone-800/80 p-3.5 sm:p-4 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Direct Client Commissions:</strong> Get contacted via WhatsApp and our integrated fit consultation chat.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Co-Tailor AI Copilot:</strong> Free yardage calculator, cutting breakdowns, and Naira pricing estimates powered by Gemini AI.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-300">
                    <strong className="text-white">Automated Bank Payouts:</strong> Verified Paystack split accounts route payouts straight to your Nigerian bank.
                  </p>
                </div>
              </div>

              {/* Designer Action CTA */}
              <div className="space-y-2 pt-1">
                <Link
                  href="/signup?role=designer"
                  onClick={handleDismiss}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Scissors className="w-4 h-4 text-stone-950 -rotate-45" />
                  <span>Register Designer Studio (Free)</span>
                  <ArrowRight className="w-4 h-4 text-stone-950" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sign-In Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 relative z-10">
          <div className="flex items-center gap-1.5">
            <span>Already have an account?</span>
            <Link
              href="/login"
              onClick={handleDismiss}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors underline underline-offset-2"
            >
              Sign In
            </Link>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
