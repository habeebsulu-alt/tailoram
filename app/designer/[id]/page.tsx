'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { DesignerProfile, PortfolioItem } from '@/lib/types';
import {
  Scissors,
  MapPin,
  MessageSquare,
  Sparkles,
  Phone,
  ArrowLeft,
  X,
  Calendar,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
} from 'lucide-react';

export default function DesignerProfilePage() {
  const params = useParams();
  const designerId = params?.id as string;
  const { user } = useAuth();

  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!designerId) return;

      try {
        setLoading(true);

        // 1. Fetch designer details with user profile
        const { data: dData, error: dError } = await supabase
          .from('designer_profiles')
          .select('*, profiles:user_id(full_name, role)')
          .eq('id', designerId)
          .single();

        if (dError) throw dError;
        setDesigner(dData as DesignerProfile);

        // 2. Fetch portfolio items
        const { data: pData, error: pError } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('designer_id', designerId)
          .order('created_at', { ascending: false });

        if (!pError && pData) {
          setPortfolio(pData as PortfolioItem[]);
        }

        // 3. Log Analytics: profile_view event from Day 1
        logEvent({
          event_type: 'profile_view',
          user_id: user?.id || null,
          designer_id: designerId,
          metadata: {
            business_name: dData?.business_name,
            state: dData?.state,
            area: dData?.area,
          },
        });

      } catch (err) {
        console.error('Failed to load designer profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [designerId, user]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm font-medium">Loading designer collection...</p>
        </div>
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-lagos-dark font-serif">
          Designer Not Found
        </h2>
        <p className="text-sm text-stone-600">
          This tailor profile may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Other Designers
        </Link>
      </div>
    );
  }

  // Format WhatsApp Link
  const cleanPhone = designer.whatsapp?.replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${designer.business_name}, I discovered your portfolio on Tailoram and would like to inquire about getting an outfit made.`
      )}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </Link>
      </div>

      {/* Designer Hero Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm relative overflow-hidden">
        
        {/* Subtle decorative background accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-brand-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          
          {/* Main Info */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-100 text-brand-800">
                Verified Nigerian Tailor
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-600 font-semibold bg-stone-100 px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {designer.area}, {designer.state}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-lagos-dark font-serif tracking-tight">
              {designer.business_name}
            </h1>

            {designer.profiles?.full_name && (
              <p className="text-xs text-stone-500 font-medium -mt-2">
                Crafted by <span className="text-stone-800 font-bold">{designer.profiles.full_name}</span>
              </p>
            )}

            {designer.bio && (
              <p className="text-sm sm:text-base text-stone-700 leading-relaxed pt-1">
                {designer.bio}
              </p>
            )}

            {/* Specialties Badges */}
            {designer.categories && designer.categories.length > 0 && (
              <div className="pt-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Specialties
                </span>
                <div className="flex flex-wrap gap-2">
                  {designer.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200 capitalize"
                    >
                      {cat.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
            <Link
              href={`/request/${designer.id}`}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 transition-all hover:scale-[1.01]"
            >
              <Send className="w-4 h-4" />
              Send Custom Request
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.01]"
              >
                <Phone className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Portfolio Gallery Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-lagos-dark font-serif">
              Portfolio &amp; Showcase
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              {portfolio.length} custom outfits and tailoring crafts
            </p>
          </div>
        </div>

        {portfolio.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-2">
            <Sparkles className="w-8 h-8 text-brand-400 mx-auto" />
            <h3 className="font-bold text-base text-lagos-dark">
              No portfolio items yet
            </h3>
            <p className="text-xs text-stone-500">
              This designer has not uploaded any photos yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {portfolio.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group cursor-pointer bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col"
              >
                <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                  {item.media_type === 'video' ? (
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.caption || 'Tailor Outfit'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  {/* Badge */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    {item.media_type === 'video' ? (
                      <>
                        <Video className="w-3 h-3" /> Video
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3" /> Photo
                      </>
                    )}
                  </span>
                </div>

                {item.caption && (
                  <div className="p-3.5 bg-white">
                    <p className="text-xs sm:text-sm text-stone-800 font-medium line-clamp-2">
                      {item.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Media Content */}
            <div className="relative flex-1 max-h-[75vh] flex items-center justify-center bg-black">
              {selectedMedia.media_type === 'video' ? (
                <video
                  src={selectedMedia.media_url}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-auto max-w-full"
                />
              ) : (
                <img
                  src={selectedMedia.media_url}
                  alt={selectedMedia.caption || 'Outfit'}
                  className="max-h-[75vh] w-auto max-w-full object-contain"
                />
              )}
            </div>

            {/* Caption in lightbox */}
            {selectedMedia.caption && (
              <div className="p-4 bg-stone-900 border-t border-stone-800 text-white">
                <p className="text-sm font-medium">{selectedMedia.caption}</p>
                <p className="text-xs text-stone-400 mt-1">
                  Posted on {new Date(selectedMedia.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
