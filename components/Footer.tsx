import React from 'react';
import { Scissors, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-lagos-dark text-stone-300 pt-12 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
                <Scissors className="w-5 h-5 -rotate-45" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tight text-white">
                  Tailoram
                </span>
                <span className="text-[10px] -mt-1 font-semibold uppercase tracking-widest text-brand-400">
                  Nigeria
                </span>
              </div>
            </div>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              Nigeria&apos;s premier social marketplace connecting skilled fashion designers and bespoke tailors across Lagos, Abuja, Port Harcourt, Ibadan, and all 36 states with clients for custom outfits, owambe attire, and native wear.
            </p>
          </div>

          {/* Nigerian Hubs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3">
              Fashion Hubs
            </h4>
            <ul className="text-sm space-y-2 text-stone-400">
              <li>Lagos (Ikeja, Lekki, VI, Yaba)</li>
              <li>Abuja FCT (Wuse, Maitama, Jabi)</li>
              <li>Rivers (Port Harcourt GRA)</li>
              <li>Oyo (Ibadan Bodija, Ring Road)</li>
              <li>Kano, Enugu, Delta &amp; Nationwide</li>
            </ul>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3">
              Specialties
            </h4>
            <ul className="text-sm space-y-2 text-stone-400">
              <li>Ankara &amp; Adire Styles</li>
              <li>Aso Ebi &amp; Owambe Glam</li>
              <li>Agbada &amp; Senator Suits</li>
              <li>Bespoke Bridal &amp; Wedding Wear</li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <p>© {new Date().getFullYear()} Tailoram. Built for Nigerian Fashion Excellence.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> for Nigerian fashion creators
          </p>
        </div>
      </div>
    </footer>
  );
}
