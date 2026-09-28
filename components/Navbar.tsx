'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, Menu, X, User, LogOut, LayoutDashboard, ShoppingBag, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, profile, designerProfile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-lagos-dark font-serif">
                Tailoram
              </span>
              <span className="text-[10px] -mt-1 font-semibold uppercase tracking-widest text-brand-600">
                Lagos Edition
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-stone-700 hover:text-brand-600 font-medium text-sm transition-colors"
            >
              Browse Designers
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                {profile?.role === 'designer' ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-1.5 text-stone-700 hover:text-brand-600 font-medium text-sm transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-brand-600" />
                      Dashboard
                    </Link>
                    {designerProfile && (
                      <Link
                        href={`/designer/${designerProfile.id}`}
                        className="text-stone-700 hover:text-brand-600 font-medium text-sm transition-colors"
                      >
                        Public Profile
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 text-stone-700 hover:text-brand-600 font-medium text-sm transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-brand-600" />
                    Find Tailors
                  </Link>
                )}

                {/* Profile Badge & Logout */}
                <div className="flex items-center gap-3 pl-3 border-l border-stone-200">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-lagos-dark leading-tight">
                      {profile?.full_name || user.email}
                    </p>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-full">
                      {profile?.role === 'designer' ? 'Tailor / Designer' : 'Client'}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Log out"
                    className="p-2 text-stone-500 hover:text-red-600 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-stone-700 hover:text-lagos-dark font-medium text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-sm transition-all hover:shadow"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-stone-800 hover:text-brand-600"
          >
            Browse Designers
          </Link>

          {user ? (
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="bg-brand-50 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-lagos-dark">
                    {profile?.full_name || user.email}
                  </p>
                  <p className="text-xs text-brand-700 capitalize font-medium">
                    {profile?.role === 'designer' ? 'Fashion Designer' : 'Client'}
                  </p>
                </div>
              </div>

              {profile?.role === 'designer' ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-medium text-stone-700 hover:text-brand-600"
                  >
                    <LayoutDashboard className="w-4 h-4 text-brand-600" />
                    Designer Dashboard
                  </Link>
                  {designerProfile && (
                    <Link
                      href={`/designer/${designerProfile.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-stone-700 hover:text-brand-600"
                    >
                      <User className="w-4 h-4 text-brand-600" />
                      View My Public Profile
                    </Link>
                  )}
                </>
              ) : null}

              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
