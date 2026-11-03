'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import TailorAssistantChat from '@/components/TailorAssistantChat';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Scissors,
  ArrowRight,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

export default function CoTailorPopup() {
  const { user, profile, designerProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isDesigner = profile?.role === 'designer' || !!designerProfile;
  const tailorId = user?.id || designerProfile?.user_id || 'guest_tailor';
  const tailorName =
    designerProfile?.business_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    'Master Tailor';

  // Open handler
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsExpanded(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
      } else {
        handleClose();
      }
    } else {
      handleOpen();
    }
  }, [isOpen, isMinimized, handleClose, handleOpen]);

  // Global event listeners
  useEffect(() => {
    const onOpenAssistant = () => handleOpen();
    const onCloseAssistant = () => handleClose();
    const onToggleAssistant = () => handleToggle();
    const onSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'assistant') {
        handleOpen();
      }
    };

    window.addEventListener('tailoram_open_assistant', onOpenAssistant);
    window.addEventListener('tailoram_close_assistant', onCloseAssistant);
    window.addEventListener('tailoram_toggle_assistant', onToggleAssistant);
    window.addEventListener('tailoram_switch_tab', onSwitchTab);

    // Escape key closes modal if open and not minimized
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('tailoram_open_assistant', onOpenAssistant);
      window.removeEventListener('tailoram_close_assistant', onCloseAssistant);
      window.removeEventListener('tailoram_toggle_assistant', onToggleAssistant);
      window.removeEventListener('tailoram_switch_tab', onSwitchTab);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleOpen, handleClose, handleToggle, isOpen, isMinimized]);

  return (
    <>
      {/* 1. Minimized floating pill (when minimized) */}
      {isOpen && isMinimized && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-950/95 text-stone-100 border border-amber-500/50 shadow-2xl shadow-black/60 backdrop-blur-md animate-in slide-in-from-bottom duration-200"
        >
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer text-left"
            title="Restore Co-Tailor chat"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                Co-Tailor
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold uppercase">
                  Active
                </span>
              </p>
              <p className="text-[10px] text-stone-400">Click to expand chat</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer ml-1"
            title="Close Co-Tailor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Full AJAX Pop-up Chat Window (when open and not minimized) */}
      {isOpen && !isMinimized && (
        <>
          {/* Mobile & expanded desktop backdrop */}
          <div
            onClick={handleClose}
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity ${
              isExpanded ? 'block' : 'md:hidden block'
            }`}
          />

          <div
            className={`fixed z-50 transition-all duration-300 ease-out flex flex-col ${
              isExpanded
                ? 'inset-4 sm:inset-10 md:inset-16 max-w-4xl mx-auto shadow-2xl'
                : 'inset-x-0 bottom-0 h-[88vh] max-h-[88vh] md:inset-auto md:bottom-6 md:right-6 md:w-[440px] md:h-[650px] md:max-h-[calc(100vh-80px)] shadow-2xl'
            }`}
          >
            {isDesigner ? (
              <TailorAssistantChat
                tailorId={tailorId}
                tailorName={tailorName}
                onClose={handleClose}
                onMinimize={() => setIsMinimized(true)}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                isExpanded={isExpanded}
                className="w-full h-full rounded-t-3xl md:rounded-3xl border border-amber-500/40 shadow-2xl bg-stone-900"
              />
            ) : (
              // Non-designer / Guest Onboarding Notice
              <div className="w-full h-full rounded-t-3xl md:rounded-3xl border border-amber-500/40 shadow-2xl bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
                <div className="px-5 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Co-Tailor AI</h3>
                      <p className="text-[11px] text-stone-400">Designer &amp; Tailor Workshop Assistant</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 text-stone-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <Scissors className="w-8 h-8 -rotate-45" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-black text-white">
                      Tailor Workshop AI Copilot
                    </h4>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Co-Tailor provides instant cutting instructions, fabric yardage formulas, and Naira pricing estimates exclusively for fashion designers and bespoke ateliers.
                    </p>
                  </div>

                  <div className="w-full pt-3 space-y-2.5">
                    <Link
                      href="/login?role=designer"
                      onClick={handleClose}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
                    >
                      <LogIn className="w-4 h-4 text-stone-950" />
                      <span>Sign In as Tailor</span>
                    </Link>

                    <Link
                      href="/signup"
                      onClick={handleClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-stone-700"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Register Studio Account</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
