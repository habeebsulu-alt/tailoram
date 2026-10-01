'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, AlertCircle, ArrowRight, Lock, Sparkles, Key, ShieldCheck } from 'lucide-react';

const DEMO_PRESETS = [
  { label: 'Dele Couture (Lagos Tailor)', email: 'dele.couture@demo.tailoram.com' },
  { label: 'Maryam Bello (Abuja Bridal)', email: 'maryam.bello@demo.tailoram.com' },
  { label: 'Emeka Bespoke (PH Senator)', email: 'emeka.craft@demo.tailoram.com' },
  { label: 'Tunde Balogun (Client)', email: 'tunde.balogun@demo.tailoram.com' },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Tailoram2026!');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);

    const { error, role } = await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Invalid email or password. If testing demo accounts, please run the password sync script in Supabase or reset via Admin.'
          : error.message
      );
    } else {
      if (role === 'designer') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-3 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Welcome to Tailoram
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Log in to manage your tailoring studio or commission bespoke orders
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
            <div className="text-[11px] text-red-600 pl-6">
              Need to initialize demo passwords? Run{' '}
              <code className="bg-red-100 px-1 py-0.5 rounded font-mono">supabase/add_admin_password_reset.sql</code>{' '}
              in your Supabase SQL editor or use the{' '}
              <Link href="/admin" className="underline font-bold">
                Admin Console
              </Link>.
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-700">
                Password
              </label>
              <span className="text-[11px] text-stone-400">Demo: Tailoram2026!</span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-extrabold text-xs bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-brand-600/20"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to Tailoram</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Demo Account Picker */}
        <div className="pt-3 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold">
            <span className="flex items-center gap-1 text-amber-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Demo Logins:
            </span>
            <span className="text-[10px] text-stone-400">Autofills credentials</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => handleSelectPreset(p.email)}
                className="p-2 rounded-xl bg-stone-50 hover:bg-amber-50 hover:border-amber-200 border border-stone-200 text-stone-700 text-[10px] font-bold text-left transition-colors flex items-center justify-between group"
              >
                <span className="truncate">{p.label}</span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-amber-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer link to Sign Up and Admin */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>

          <Link href="/admin" className="font-semibold text-stone-500 hover:text-amber-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
