'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Smartphone, Sparkles, CheckCircle2, Scissors } from 'lucide-react';

export default function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if already installed / running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user is on an Android device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const androidCheck = /android/i.test(userAgent);
    setIsAndroid(androidCheck);

    // 3. Check if user dismissed it recently in this session
    const isDismissed = sessionStorage.getItem('tailoram_android_prompt_dismissed');
    if (isDismissed) return;

    // 4. Capture native beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (androidCheck) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Detect appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: show manual Chrome install instructions
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('tailoram_android_prompt_dismissed', 'true');
  };

  if (isInstalled || !isAndroid || (!showPrompt && !showManualGuide)) {
    return null;
  }

  return (
    <>
      {/* Floating Android App Install Toast Bar */}
      {showPrompt && !showManualGuide && (
        <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slideUp">
          <div className="bg-stone-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 p-0.5 shrink-0 shadow-md">
                <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-brand-400 -rotate-45" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs sm:text-sm text-stone-100 truncate">
                    Tailoram Android App
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">
                    Official
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 truncate mt-0.5">
                  Fast native experience & push notifications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-stone-950 stroke-[3]" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Installation Lightbox for Android */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-sm">
                  <Scissors className="w-5 h-5 -rotate-45" />
                </div>
                <div>
                  <h3 className="font-black text-base">Install on Android</h3>
                  <p className="text-xs text-stone-400">Add Tailoram to Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualGuide(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 text-xs text-stone-300">
              <div className="flex items-start gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p>
                  Tap the <strong className="text-white">three dots menu (⋮)</strong> at the top-right of your Chrome browser.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p>
                  Select <strong className="text-amber-400">"Install app"</strong> or <strong className="text-amber-400">"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <p>
                  Confirm by tapping <strong className="text-white">Install</strong>. Tailoram will be added directly to your app drawer!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
