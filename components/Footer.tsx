import React from 'react';
import Link from 'next/link';
import { Scissors, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-lagos-dark text-stone-300 pt-12 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Scissors className="w-4 h-4 -rotate-45" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white font-serif">
                Tailoram
              </span>
            </div>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              Nigeria&apos;s premier social marketplace connecting skilled fashion designers and tailors in Lagos with clients for custom outfits, owambe attire, and native wear.
            </p>
          </div>

          {/* Lagos Areas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3">
              Lagos Hubs
            </h4>
            <ul className="text-sm space-y-2 text-stone-400">
              <li>Ikeja &amp; Maryland</li>
              <li>Lekki &amp; Ajah</li>
              <li>Victoria Island &amp; Ikoyi</li>
              <li>Yaba &amp; Surulere</li>
            </ul>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3">
              Specialties
            </h4>
            <ul className="text-sm space-y-2 text-stone-400">
              <li>Ankara &amp; Adire</li>
              <li>Aso Ebi &amp; Owambe Glam</li>
              <li>Agbada &amp; Senegalese</li>
              <li>Bespoke Bridal Wear</li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <p>© {new Date().getFullYear()} Tailoram. Built for Nigerian Fashion Excellence.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> in Lagos, Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
