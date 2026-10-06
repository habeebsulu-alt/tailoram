'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Compass,
  ShoppingBag,
  Clock,
  LayoutDashboard,
  User,
  ShieldCheck,
  Scissors,
  Ruler,
} from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  // Hide mobile bottom nav on admin panel or messages thread to maximize screen real estate
  if (pathname.startsWith('/entrypoint') || pathname.startsWith('/messages')) {
    return null;
  }

  const isDesigner = profile?.role === 'designer';
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    {
      label: 'Explore',
      href: '/',
      icon: Compass,
      isActive: pathname === '/',
    },
    {
      label: 'RTW Shop',
      href: '/shop',
      icon: ShoppingBag,
      isActive: pathname.startsWith('/shop'),
    },
    {
      label: 'Orders',
      href: '/requests',
      icon: Clock,
      isActive: pathname.startsWith('/requests'),
    },
    ...(isDesigner
      ? [
          {
            label: 'Studio',
            href: '/dashboard',
            icon: Scissors,
            isActive: pathname.startsWith('/dashboard'),
          },
        ]
      : isAdmin
      ? [
          {
            label: 'Admin',
            href: '/entrypoint',
            icon: ShieldCheck,
            isActive: pathname.startsWith('/entrypoint'),
          },
        ]
      : [
          {
            label: 'Vault',
            href: '/vault',
            icon: Ruler,
            isActive: pathname.startsWith('/vault'),
          },
        ]),
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/80 md:hidden px-2 pt-1.5 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.4)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all select-none min-w-[64px] ${
                active
                  ? 'text-amber-400 scale-105'
                  : 'text-stone-400 hover:text-stone-200 active:scale-95'
              }`}
            >
              <div
                className={`relative p-1 rounded-xl transition-all ${
                  active ? 'bg-amber-500/15' : ''
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {active && (
                  <span className="absolute -top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] font-bold tracking-tight mt-0.5 ${
                  active ? 'text-amber-400 font-extrabold' : 'text-stone-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
