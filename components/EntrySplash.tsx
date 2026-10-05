'use client';

import React, { useEffect, useState } from 'react';
import { Scissors, Sparkles, ArrowRight } from 'lucide-react';

interface EntrySplashProps {
  onComplete?: () => void;
}

const WORDS = [
  'BESPOKE AGBADA',
  'OWAMBE COUTURE',
  'EXECUTIVE SENATOR',
  'VIBRANT ANKARA',
  'READY-TO-WEAR',
  'YOUR ALL IN ONE FASHION PLUG',
];

export default function EntrySplash({ onComplete }: EntrySplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinalPhrase, setIsFinalPhrase] = useState(false);

  useEffect(() => {
    // Check if user already saw the splash during this session
    const seen = sessionStorage.getItem('tailoram_entry_splash_seen');
    if (seen === 'true') {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Lock body scroll while splash is active
    document.body.style.overflow = 'hidden';

    // 1. Cycle through words at a luxurious, deliberate pace (750ms each)
    let wordIdx = 0;
    const wordInterval = setInterval(() => {
      wordIdx += 1;
      if (wordIdx < WORDS.length - 1) {
        setCurrentWordIndex(wordIdx);
      } else {
        // Land on the final requested text: "YOUR ALL IN ONE FASHION PLUG"
        setCurrentWordIndex(WORDS.length - 1);
        setIsFinalPhrase(true);
        clearInterval(wordInterval);
      }
    }, 750);

    // 2. Progress bar animation over deliberate 5.75s duration
    const startTime = Date.now();
    const duration = 5750; // Total display duration (5.75 seconds to savor the animation)

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        handleExit();
      }
    }, 30);

    const handleExit = () => {
      setIsSlidingOut(true);
      sessionStorage.setItem('tailoram_entry_splash_seen', 'true');
      document.body.style.overflow = '';

      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 750); // Matches slide-out transition
    };

    return () => {
      clearInterval(wordInterval);
      clearInterval(progressInterval);
      document.body.style.overflow = '';
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsSlidingOut(true);
    sessionStorage.setItem('tailoram_entry_splash_seen', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between bg-stone-950 text-white select-none overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
        isSlidingOut ? '-translate-y-full pointer-events-none' : 'translate-y-0'
      }`}
    >
      {/* Ambient background glows and Oando-inspired gradient lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]" />
        {/* Subtle grid mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Header Bar: Logo & Skip */}
      <header className="relative z-10 px-6 sm:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
            <Scissors className="w-5 h-5 -rotate-45" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-white font-sans">
              Tailoram
            </span>
            <span className="text-[10px] -mt-1 font-semibold uppercase tracking-widest text-brand-400">
              Nigeria
            </span>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-stone-300 hover:text-white text-xs font-bold transition-all backdrop-blur-md active:scale-95"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      {/* Center Cinematic Kinetic Text Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-6 my-auto">
        
        {/* Sub-label tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-amber-300 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Nigeria&apos;s Bespoke Fashion Network
        </div>

        {/* Main Oando-style dynamic text punch */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-stone-400">
            WE ARE TAILORAM
          </p>

          <div className="min-h-[90px] sm:min-h-[130px] flex items-center justify-center">
            <h1
              key={currentWordIndex}
              className={`text-3xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none animate-text-pop transition-all ${
                isFinalPhrase
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 scale-105 drop-shadow-[0_0_40px_rgba(251,191,36,0.45)]'
                  : 'text-white scale-100 opacity-95'
              }`}
            >
              {WORDS[currentWordIndex]}
            </h1>
          </div>
        </div>

        {/* High-fashion quote / subtitle */}
        <p className="text-xs sm:text-base text-stone-300/80 max-w-xl mx-auto font-medium leading-relaxed tracking-wide pt-2">
          &ldquo;Connecting Nigeria&apos;s finest bespoke tailors, owambe designers, and Ready-to-Wear collections across all 36 states.&rdquo;
        </p>

      </main>

      {/* Bottom Progress Bar & Loading Indicator */}
      <footer className="relative z-10 px-6 sm:px-12 py-8 flex flex-col gap-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            Curating Studios Across All 36 States
          </span>
          <span className="font-mono text-amber-400">{progress}%</span>
        </div>

        {/* Progress track */}
        <div className="w-full h-1 bg-stone-900 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-amber-400 to-amber-300 transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </footer>

    </div>
  );
}
