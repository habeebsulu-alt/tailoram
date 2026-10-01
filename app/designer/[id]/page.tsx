'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { DesignerProfile, PortfolioItem, Review } from '@/lib/types';
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
  Star,
  CheckCircle2,
  Share2,
  Play,
} from 'lucide-react';

const STYLE_CATEGORIES = [
  { id: 'all', label: 'All Styles' },
  { id: 'agbada', label: 'Agbada' },
  { id: 'aso_ebi', label: 'Aso Ebi' },
  { id: 'senator', label: 'Senator & Kaftan' },
  { id: 'ankara', label: 'Ankara Prints' },
  { id: 'adire', label: 'Adire & Heritage' },
  { id: 'bridal', label: 'Bridal' },
  { id: 'ready_to_wear', label: 'Ready-to-Wear' },
  { id: 'contemporary', label: 'Contemporary' },
];

function getItemCategory(item: PortfolioItem, designerCategories?: string[]): string {
  if (item.category && item.category !== 'all') return item.category;
  const text = (item.caption || '').toLowerCase();
  if (text.includes('agbada') || text.includes('senegalese') || text.includes('boubou') || text.includes('baban riga')) return 'agbada';
  if (text.includes('aso ebi') || text.includes('asoebi') || text.includes('lace') || text.includes('gele') || text.includes('corset') || text.includes('owambe')) return 'aso_ebi';
  if (text.includes('senator') || text.includes('kaftan') || text.includes('caftan') || text.includes('native') || text.includes('jalabiya')) return 'senator';
  if (text.includes('ankara') || text.includes('wax') || text.includes('kitenge') || text.includes('kente')) return 'ankara';
  if (text.includes('adire') || text.includes('tie-dye') || text.includes('indigo') || text.includes('batik')) return 'adire';
  if (text.includes('bridal') || text.includes('wedding') || text.includes('george') || text.includes('bride')) return 'bridal';
  if (text.includes('rtw') || text.includes('ready-to-wear')) return 'ready_to_wear';
  
  if (designerCategories && designerCategories.length > 0) {
    const first = designerCategories[0].toLowerCase();
    if (first.includes('agbada')) return 'agbada';
    if (first.includes('aso_ebi') || first.includes('aso ebi')) return 'aso_ebi';
    if (first.includes('senator')) return 'senator';
    if (first.includes('ankara')) return 'ankara';
    if (first.includes('bridal')) return 'bridal';
  }
  return 'contemporary';
}

const CATEGORY_NAMES: Record<string, string> = {
  agbada: 'Agbada',
  aso_ebi: 'Aso Ebi',
  senator: 'Senator & Kaftan',
  ankara: 'Ankara Prints',
  adire: 'Adire',
  bridal: 'Bridal',
  ready_to_wear: 'Ready-to-Wear',
  contemporary: 'Contemporary',
  all: 'Bespoke',
};

export default function DesignerProfilePage() {
  const params = useParams();
  const designerId = params?.id as string;
  const { user, profile } = useAuth();

  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<PortfolioItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Leave review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

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

        // 3. Fetch reviews
        try {
          const { data: rData } = await supabase
            .from('reviews')
            .select('*, client:client_id(full_name)')
            .eq('designer_id', designerId)
            .order('created_at', { ascending: false });

          if (rData) {
            setReviews(rData as Review[]);
          }
        } catch (revErr) {
          console.warn('Reviews table might not be initialized yet');
        }

        // 4. Log Analytics: profile_view event from Day 1
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !designer) return;

    try {
      setSubmittingReview(true);
      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            designer_id: designer.id,
            client_id: user.id,
            rating: newRating,
            comment: newComment.trim() || null,
          },
        ])
        .select('*, client:client_id(full_name)')
        .single();

      if (error) throw error;

      setReviewSuccess('Thank you for rating this tailor!');
      if (data) {
        setReviews([data as Review, ...reviews]);
      }

      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewSuccess('');
        setNewComment('');
      }, 1500);
    } catch (err: any) {
      alert('Could not submit review: ' + (err.message || 'Please try again.'));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900">
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

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </Link>
      </div>

      {/* Designer Hero Banner Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-100/40 via-amber-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          
          {/* Main Info */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                Verified Nigerian Tailor
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-600 font-semibold bg-stone-100 px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {designer.area}, {designer.state}
              </span>

              {avgRating ? (
                <span className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {avgRating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-stone-400 bg-stone-50 px-2.5 py-1 rounded-full">
                  New on Tailoram
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
              {designer.business_name}
            </h1>

            {designer.profiles?.full_name && (
              <p className="text-xs text-stone-500 font-medium -mt-2">
                Master Tailor: <strong className="text-stone-800">{designer.profiles.full_name}</strong>
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
                  Specialties &amp; Garments
                </span>
                <div className="flex flex-wrap gap-2">
                  {designer.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-brand-50 text-brand-800 border border-brand-200 capitalize"
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
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 transition-all hover:scale-[1.01]"
            >
              <Send className="w-4 h-4" />
              Send Custom Request
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.01]"
              >
                <Phone className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            )}

            {user && profile?.role === 'client' && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-all"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Write a Review
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Portfolio Gallery Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Portfolio &amp; Showcase
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              {portfolio.length} bespoke garments and tailoring works
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">
              Found a design you like? Click <strong className="text-amber-700 font-bold">Use as Inspo</strong> to remake it!
            </span>
          </div>
        </div>

        {/* Style Category Filter Tabs */}
        {portfolio.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {STYLE_CATEGORIES.filter((cat) => {
              if (cat.id === 'all') return true;
              return portfolio.some(item => getItemCategory(item, designer.categories) === cat.id);
            }).map((cat) => {
              const count = cat.id === 'all' 
                ? portfolio.length 
                : portfolio.filter(item => getItemCategory(item, designer.categories) === cat.id).length;
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {portfolio.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2">
            <Sparkles className="w-8 h-8 text-brand-400 mx-auto" />
            <h3 className="font-bold text-base text-stone-900">
              No portfolio items yet
            </h3>
            <p className="text-xs text-stone-500">
              This designer has not uploaded any photos yet. Check back soon!
            </p>
          </div>
        ) : (
          (() => {
            const displayItems = selectedCategory === 'all'
              ? portfolio
              : portfolio.filter(item => getItemCategory(item, designer.categories) === selectedCategory);

            if (displayItems.length === 0) {
              return (
                <div className="bg-stone-50 rounded-2xl p-8 text-center space-y-2 border border-stone-200">
                  <p className="text-sm font-semibold text-stone-700">No works found in this style category</p>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    View all styles ({portfolio.length})
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayItems.map((item) => {
                  const itemCat = getItemCategory(item, designer.categories);
                  const itemRating = (item.rating || designer.avg_rating || 5.0).toFixed(1);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMedia(item)}
                      className="group cursor-pointer bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between"
                    >
                      <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                        {/* Rating badge on preview */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-md z-10">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>{itemRating}</span>
                        </div>

                        {/* Media type badge */}
                        <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 z-10">
                          {item.media_type === 'video' ? (
                            <>
                              <Video className="w-3 h-3 text-brand-400" /> Reel
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3" /> Photo
                            </>
                          )}
                        </span>

                        {/* Category badge */}
                        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-900/85 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider z-10">
                          {CATEGORY_NAMES[itemCat] || 'Bespoke'}
                        </span>

                        {item.media_type === 'video' ? (
                          <div className="relative w-full h-full">
                            <video
                              src={item.media_url}
                              muted
                              playsInline
                              autoPlay
                              loop
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                              <div className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm text-stone-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-stone-900 text-stone-900 ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.media_url}
                            alt={item.caption || 'Tailor Outfit'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="p-3.5 bg-white flex flex-col justify-between flex-1 gap-2.5">
                        <p className="text-xs sm:text-sm text-stone-800 font-medium line-clamp-2">
                          {item.caption || `${CATEGORY_NAMES[itemCat]} tailored by ${designer.business_name}`}
                        </p>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-stone-400">
                            {CATEGORY_NAMES[itemCat]}
                          </span>

                          <Link
                            href={`/request/${designer.id}?inspoUrl=${encodeURIComponent(item.media_url)}&styleTitle=${encodeURIComponent(item.caption || CATEGORY_NAMES[itemCat] || 'Bespoke Style')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[11px] shadow-sm shadow-amber-500/20 transition-all"
                            title="Remake this style with bespoke tailoring"
                          >
                            <Sparkles className="w-3 h-3 fill-white" />
                            <span>Use as Inspo</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* REVIEWS & RATINGS SECTION */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              Client Reviews &amp; Ratings
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Verified feedback from clients who ordered outfits
            </p>
          </div>

          {user && profile?.role === 'client' && (
            <button
              onClick={() => setReviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-sm"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              Write Review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-10 text-center max-w-md mx-auto space-y-2">
            <p className="text-sm font-bold text-stone-800">No reviews yet for this tailor</p>
            <p className="text-xs text-stone-500">
              Be the first client to work with {designer.business_name} and share your experience!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900 text-sm">
                      {rev.client?.full_name || 'Client'}
                    </p>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
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
            className="relative max-w-3xl w-full max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative flex-1 max-h-[68vh] flex items-center justify-center bg-black">
              {selectedMedia.media_type === 'video' ? (
                <video
                  src={selectedMedia.media_url}
                  controls
                  autoPlay
                  className="max-h-[68vh] w-auto max-w-full"
                />
              ) : (
                <img
                  src={selectedMedia.media_url}
                  alt={selectedMedia.caption || 'Outfit'}
                  className="max-h-[68vh] w-auto max-w-full object-contain"
                />
              )}
            </div>

            <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-stone-800 text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-stone-700">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {(selectedMedia.rating || designer.avg_rating || 5.0).toFixed(1)} Rating
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-800 text-[11px] font-bold text-stone-300 border border-stone-700">
                    {CATEGORY_NAMES[getItemCategory(selectedMedia, designer.categories)] || 'Bespoke'}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2">
                  {selectedMedia.caption || 'Bespoke Tailoring Outfit'}
                </p>
                <p className="text-xs text-stone-400">
                  By {designer.business_name} • {selectedMedia.media_type === 'video' ? 'Video Reel' : 'Photo'}
                </p>
              </div>

              <Link
                href={`/request/${designer.id}?inspoUrl=${encodeURIComponent(selectedMedia.media_url)}&styleTitle=${encodeURIComponent(selectedMedia.caption || CATEGORY_NAMES[getItemCategory(selectedMedia, designer.categories)] || 'Bespoke Style')}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Remake This / Use as Inspo</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Review {designer.business_name}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= newRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-stone-700 ml-2">
                      {newRating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Feedback / Experience
                  </label>
                  <textarea
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Describe the fabric quality, stitching precision, communication, and turnaround time..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingReview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
