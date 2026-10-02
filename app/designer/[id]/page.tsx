'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import {
  DesignerProfile,
  PortfolioItem,
  Review,
  StoreProduct,
  GENDER_FOCUS_OPTIONS,
  getDesignerGender,
} from '@/lib/types';
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
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Tag,
  Maximize2,
} from 'lucide-react';

const CATEGORY_SEQUENCE = [
  'agbada',
  'aso_ebi',
  'senator',
  'ankara',
  'adire',
  'bridal',
  'ready_to_wear',
  'contemporary',
];

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Studio Store state & swipable preview modal
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [profileTab, setProfileTab] = useState<'portfolio' | 'store'>('portfolio');
  const [selectedStoreIndex, setSelectedStoreIndex] = useState<number | null>(null);
  const [storeTouchStartX, setStoreTouchStartX] = useState<number | null>(null);

  // Leave review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Sort portfolio by category sequence so "All Styles" groups in sequence:
  // Agbada -> Aso Ebi -> Senator -> Ankara -> Adire -> Bridal -> RTW -> Contemporary
  const orderedPortfolio = useMemo(() => {
    return [...portfolio].sort((a, b) => {
      const catA = getItemCategory(a, designer?.categories);
      const catB = getItemCategory(b, designer?.categories);
      const idxA = CATEGORY_SEQUENCE.indexOf(catA);
      const idxB = CATEGORY_SEQUENCE.indexOf(catB);
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [portfolio, designer?.categories]);

  // Display items based on current category selection, preserving category sequence
  const displayItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return orderedPortfolio;
    }
    return orderedPortfolio.filter(
      (item) => getItemCategory(item, designer?.categories) === selectedCategory
    );
  }, [orderedPortfolio, selectedCategory, designer?.categories]);

  const goToNext = () => {
    if (displayItems.length === 0) return;
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % displayItems.length : 0));
  };

  const goToPrev = () => {
    if (displayItems.length === 0) return;
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + displayItems.length) % displayItems.length : 0));
  };

  const goToNextStore = () => {
    if (storeProducts.length === 0) return;
    setSelectedStoreIndex((prev) => (prev !== null ? (prev + 1) % storeProducts.length : 0));
  };

  const goToPrevStore = () => {
    if (storeProducts.length === 0) return;
    setSelectedStoreIndex((prev) => (prev !== null ? (prev - 1 + storeProducts.length) % storeProducts.length : 0));
  };

  useEffect(() => {
    if (selectedIndex === null && selectedStoreIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedStoreIndex !== null) {
        if (e.key === 'ArrowRight') goToNextStore();
        else if (e.key === 'ArrowLeft') goToPrevStore();
        else if (e.key === 'Escape') setSelectedStoreIndex(null);
        return;
      }

      if (selectedIndex !== null) {
        if (e.key === 'ArrowRight') {
          goToNext();
        } else if (e.key === 'ArrowLeft') {
          goToPrev();
        } else if (e.key === 'Escape') {
          setSelectedIndex(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, selectedStoreIndex, displayItems, storeProducts.length]);

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
        const localAvatar = typeof window !== 'undefined' ? localStorage.getItem(`tailoram_avatar_${designerId}`) : null;
        const mergedDesigner: DesignerProfile = {
          ...(dData as DesignerProfile),
          profile_image_url: (dData as any).profile_image_url || localAvatar || null,
        };
        setDesigner(mergedDesigner);

        // 2. Fetch portfolio items
        const { data: pData, error: pError } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('designer_id', designerId)
          .order('created_at', { ascending: false });

        if (!pError && pData) {
          const deletedIds: string[] = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('tailoram_deleted_portfolio_items') || '[]')
            : [];
          const updatedMap: Record<string, Partial<PortfolioItem>> = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('tailoram_updated_portfolio_items') || '{}')
            : {};
          const activePortfolio = ((pData as PortfolioItem[]) || [])
            .filter((i) => !deletedIds.includes(i.id))
            .map((i) => (updatedMap[i.id] ? { ...i, ...updatedMap[i.id] } : i));
          setPortfolio(activePortfolio);
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

        // 4. Fetch store products if store enabled
        try {
          const { data: sData } = await supabase
            .from('store_products')
            .select('*')
            .eq('designer_id', designerId)
            .order('created_at', { ascending: false });

          if (sData) {
            setStoreProducts(sData as StoreProduct[]);
          }
        } catch (storeErr) {
          console.warn('Store products not yet initialized');
        }

        // 5. Log Analytics: profile_view event from Day 1
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
          <div className="flex flex-col sm:flex-row items-start gap-6 max-w-2xl">
            {/* Studio Avatar / Profile Picture */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-stone-200 bg-stone-100 shadow-md relative">
                {designer.profile_image_url ? (
                  <img
                    src={designer.profile_image_url}
                    alt={designer.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-600 to-amber-600 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner">
                    {designer.business_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {designer.is_verified && (
                <div
                  title="Tailoram Verified Studio"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 fill-white text-emerald-500" />
                </div>
              )}
            </div>

            <div className="space-y-4 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                  Verified Nigerian Tailor
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-600 font-semibold bg-stone-100 px-3 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  {designer.area}, {designer.state}
                </span>

                {(() => {
                  const gFocus = getDesignerGender(designer);
                  const gInfo = GENDER_FOCUS_OPTIONS.find((g) => g.id === gFocus);
                  return (
                    <span className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      gFocus === 'male'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : gFocus === 'female'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {gInfo?.icon} {gInfo?.tag || 'Unisex'}
                    </span>
                  );
                })()}

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

              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
                  {designer.business_name}
                </h1>
              {designer.is_verified && (
                <span
                  title="Tailoram Verified Studio"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Studio</span>
                </span>
              )}
              {designer.is_featured && (
                <span
                  title="Featured Showcase Studio"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Featured</span>
                </span>
              )}
            </div>

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

            {storeProducts.length > 0 && (
              <button
                onClick={() => setProfileTab('store')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold text-xs transition-all shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Visit Studio Store ({storeProducts.length} RTW Items)</span>
              </button>
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

      {/* Studio View Mode Switcher: Portfolio vs Store */}
      {storeProducts.length > 0 && (
        <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
          <button
            onClick={() => setProfileTab('portfolio')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              profileTab === 'portfolio'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Portfolio &amp; Showcase</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              profileTab === 'portfolio' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              {portfolio.length}
            </span>
          </button>

          <button
            onClick={() => setProfileTab('store')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              profileTab === 'store'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-700" />
            <span>Studio Store &amp; Ready-to-Wear</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              profileTab === 'store' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
              {storeProducts.length}
            </span>
          </button>
        </div>
      )}

      {/* TAB 1: PORTFOLIO GALLERY SECTION */}
      {profileTab === 'portfolio' && (
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
        ) : displayItems.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl p-8 text-center space-y-2 border border-stone-200">
            <p className="text-sm font-semibold text-stone-700">No works found in this style category</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              View all styles ({portfolio.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayItems.map((item, idx) => {
              const itemCat = getItemCategory(item, designer.categories);
              const itemRating = (item.rating || designer.avg_rating || 5.0).toFixed(1);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(idx);
                    }
                  }}
                  className="group cursor-pointer bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-brand-500 select-none"
                >
                  <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                    {/* Rating badge on preview */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-md z-10 pointer-events-none">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{itemRating}</span>
                    </div>

                    {/* Media type badge */}
                    <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 z-10 pointer-events-none">
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
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-900/85 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider z-10 pointer-events-none">
                      {CATEGORY_NAMES[itemCat] || 'Bespoke'}
                    </span>

                    {/* Tap to Preview overlay on hover / focus */}
                    <div className="absolute inset-0 bg-stone-950/25 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-10 pointer-events-none flex items-center justify-center">
                      <div className="px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-black flex items-center gap-1.5 shadow-xl border border-white/20 transform group-hover:scale-105 transition-transform">
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tap to Preview</span>
                      </div>
                    </div>

                    {item.media_type === 'video' ? (
                      <div className="relative w-full h-full pointer-events-none">
                        <video
                          src={item.media_url}
                          muted
                          playsInline
                          autoPlay
                          loop
                          className="w-full h-full object-cover object-top pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm text-stone-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-stone-900 text-stone-900 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.caption || 'Tailor Outfit'}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[11px] shadow-sm shadow-amber-500/20 transition-all z-20"
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
            )}
          </div>
        )}

      {/* TAB 2: STUDIO STORE / READY-TO-WEAR SECTION */}
      {profileTab === 'store' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                {designer.store_name || `${designer.business_name} RTW Collection`}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                Ready-to-wear bespoke garments and curated fabrics ready for immediate commission
              </p>
            </div>
          </div>

          {storeProducts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2">
              <ShoppingBag className="w-8 h-8 text-stone-400 mx-auto" />
              <h3 className="font-bold text-base text-stone-900">
                Store is being stocked
              </h3>
              <p className="text-xs text-stone-500">
                {designer.business_name} has not listed ready-to-wear items yet. You can still commission custom bespoke outfits via the request button!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {storeProducts.map((product, pIdx) => {
                const cleanPhone = designer.whatsapp?.replace(/[^0-9]/g, '');

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedStoreIndex(pIdx)}
                    className="group cursor-pointer bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold">
                        In Stock
                      </span>

                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 group-hover:bg-amber-500 transition-colors">
                        <ShoppingBag className="w-3 h-3 text-amber-300 group-hover:text-white" />
                        <span>Swipe Preview</span>
                      </span>
                    </div>

                    <div className="p-3.5 bg-white flex flex-col justify-between flex-1 gap-2.5">
                      <div className="space-y-1">
                        <p className="text-base font-black text-stone-900">
                          ₦{product.price.toLocaleString()}
                        </p>
                        <p className="text-xs sm:text-sm text-stone-800 font-bold line-clamp-1">
                          {product.title}
                        </p>
                        {product.description && (
                          <p className="text-[11px] text-stone-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {product.sizes && product.sizes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {product.sizes.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${designer.business_name}, I want to buy "${product.title}" (₦${product.price.toLocaleString()}) from your Tailoram store.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Order via WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <Link
                          href={`/request/${designer.id}?inspoUrl=${encodeURIComponent(product.image_url)}&styleTitle=${encodeURIComponent(product.title)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center py-1.5 px-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-all"
                        >
                          Buy / Order
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Interactive Lightbox / Slider Modal */}
      {selectedIndex !== null && displayItems[selectedIndex] && (() => {
        const activeMedia = displayItems[selectedIndex];
        const activeCat = getItemCategory(activeMedia, designer.categories);
        const activeRating = (activeMedia.rating || designer.avg_rating || 5.0).toFixed(1);

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setSelectedIndex(null)}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX !== null) {
                const diff = touchStartX - e.changedTouches[0].clientX;
                if (diff > 40) goToNext();
                else if (diff < -40) goToPrev();
                setTouchStartX(null);
              }
            }}
          >
            {/* Top right floating close button for instant dismissal on any device */}
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="fixed top-4 right-4 z-[110] w-10 h-10 rounded-full bg-stone-900/90 hover:bg-stone-800 text-white flex items-center justify-center border border-stone-700 shadow-2xl transition-transform active:scale-95"
              aria-label="Close Preview (Esc)"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div
              className="relative max-w-4xl w-full max-h-[95vh] bg-stone-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-stone-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar: Category, Counter & Close */}
              <div className="px-4 py-3 bg-stone-950/85 backdrop-blur-md flex items-center justify-between border-b border-stone-800/80 z-30">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-stone-800 text-xs font-bold text-amber-400 flex items-center gap-1 border border-stone-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {activeRating}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-stone-800 text-xs font-extrabold uppercase tracking-wider text-stone-200 border border-stone-700">
                    {CATEGORY_NAMES[activeCat] || 'Bespoke'}
                  </span>
                  <span className="text-xs font-medium text-stone-400 hidden sm:inline">
                    • Work {selectedIndex + 1} of {displayItems.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-400 sm:hidden">
                    {selectedIndex + 1}/{displayItems.length}
                  </span>
                  <button
                    onClick={() => setSelectedIndex(null)}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Media Viewport with Floating Slider Arrows */}
              <div className="relative flex-1 min-h-[45vh] max-h-[62vh] flex items-center justify-center bg-black overflow-hidden group select-none">
                {displayItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                      }}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
                      aria-label="Previous work"
                      title="Previous work (Left Arrow)"
                    >
                      <ChevronLeft className="w-6 h-6 -ml-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
                      aria-label="Next work"
                      title="Next work (Right Arrow)"
                    >
                      <ChevronRight className="w-6 h-6 ml-0.5" />
                    </button>
                  </>
                )}

                {/* Media Content */}
                <div key={activeMedia.id} className="w-full h-full flex items-center justify-center animate-in fade-in duration-200">
                  {activeMedia.media_type === 'video' ? (
                    <video
                      src={activeMedia.media_url}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[62vh] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src={activeMedia.media_url}
                      alt={activeMedia.caption || 'Outfit'}
                      className="max-h-[62vh] w-auto max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Thumbnail Strip for fast scrubbing along category sequence */}
              {displayItems.length > 1 && (
                <div className="bg-stone-950 px-4 py-2 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {displayItems.map((item, idx) => {
                    const isCurrent = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(idx);
                        }}
                        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                          isCurrent
                            ? 'ring-2 ring-amber-400 scale-105 opacity-100 shadow-md'
                            : 'opacity-40 hover:opacity-80'
                        }`}
                        title={item.caption || `Work ${idx + 1}`}
                      >
                        {item.media_type === 'video' ? (
                          <video src={item.media_url} muted className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bottom Info & "Use as Inspo" Action */}
              <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-100 line-clamp-2">
                    {activeMedia.caption || `${CATEGORY_NAMES[activeCat]} Bespoke Design`}
                  </p>
                  <p className="text-xs text-stone-400">
                    Tailored by {designer.business_name} • {activeMedia.media_type === 'video' ? 'Video Reel' : 'Photo'}
                  </p>
                </div>

                <Link
                  href={`/request/${designer.id}?inspoUrl=${encodeURIComponent(activeMedia.media_url)}&styleTitle=${encodeURIComponent(activeMedia.caption || CATEGORY_NAMES[activeCat] || 'Bespoke Style')}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>Remake This / Use as Inspo</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Swipable Store Product Modal */}
      {selectedStoreIndex !== null && storeProducts[selectedStoreIndex] && (() => {
        const activeProduct = storeProducts[selectedStoreIndex];
        const cleanPhone = designer.whatsapp?.replace(/[^0-9]/g, '');

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setSelectedStoreIndex(null)}
            onTouchStart={(e) => setStoreTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (storeTouchStartX !== null) {
                const diff = storeTouchStartX - e.changedTouches[0].clientX;
                if (diff > 40) goToNextStore();
                else if (diff < -40) goToPrevStore();
                setStoreTouchStartX(null);
              }
            }}
          >
            {/* Top right floating close button for instant dismissal */}
            <button
              type="button"
              onClick={() => setSelectedStoreIndex(null)}
              className="fixed top-4 right-4 z-[110] w-10 h-10 rounded-full bg-stone-900/90 hover:bg-stone-800 text-white flex items-center justify-center border border-stone-700 shadow-2xl transition-transform active:scale-95"
              aria-label="Close Preview (Esc)"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div
              className="relative max-w-4xl w-full max-h-[95vh] bg-stone-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-stone-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar */}
              <div className="px-4 py-3 bg-stone-950/85 backdrop-blur-md flex items-center justify-between border-b border-stone-800/80 z-30">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-600/90 text-xs font-bold text-white flex items-center gap-1">
                    ● In Stock
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-stone-800 text-xs font-black text-amber-400 border border-stone-700">
                    ₦{activeProduct.price.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-stone-400 hidden sm:inline">
                    • Item {selectedStoreIndex + 1} of {storeProducts.length} (Swipe or use ← → arrows)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-400 sm:hidden">
                    {selectedStoreIndex + 1}/{storeProducts.length}
                  </span>
                  <button
                    onClick={() => setSelectedStoreIndex(null)}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Media Viewport with Floating Slider Arrows */}
              <div className="relative flex-1 min-h-[45vh] max-h-[58vh] flex items-center justify-center bg-black overflow-hidden group select-none">
                {storeProducts.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevStore();
                      }}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
                      aria-label="Previous product"
                      title="Previous product (Left Arrow)"
                    >
                      <ChevronLeft className="w-6 h-6 -ml-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextStore();
                      }}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
                      aria-label="Next product"
                      title="Next product (Right Arrow)"
                    >
                      <ChevronRight className="w-6 h-6 ml-0.5" />
                    </button>
                  </>
                )}

                {/* Product Image */}
                <div key={activeProduct.id} className="w-full h-full flex items-center justify-center animate-in fade-in duration-200">
                  <img
                    src={activeProduct.image_url}
                    alt={activeProduct.title}
                    className="max-h-[58vh] w-auto max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Thumbnail Strip for fast product scrubbing */}
              {storeProducts.length > 1 && (
                <div className="bg-stone-950 px-4 py-2 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {storeProducts.map((p, idx) => {
                    const isCurrent = idx === selectedStoreIndex;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStoreIndex(idx);
                        }}
                        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                          isCurrent
                            ? 'ring-2 ring-amber-400 scale-105 opacity-100 shadow-md'
                            : 'opacity-40 hover:opacity-80'
                        }`}
                        title={p.title}
                      >
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bottom Info & Buy / Inquire Actions */}
              <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base sm:text-lg font-black text-amber-400">
                      ₦{activeProduct.price.toLocaleString()}
                    </p>
                    <span className="text-xs text-stone-400">• {activeProduct.title}</span>
                  </div>
                  {activeProduct.description && (
                    <p className="text-xs text-stone-300 line-clamp-2 max-w-xl">
                      {activeProduct.description}
                    </p>
                  )}
                  {activeProduct.sizes && activeProduct.sizes.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase">Available Sizes:</span>
                      {activeProduct.sizes.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 text-[10px] font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${designer.business_name}, I want to buy "${activeProduct.title}" (₦${activeProduct.price.toLocaleString()}) from your Tailoram store.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Order on WhatsApp</span>
                    </a>
                  )}

                  <Link
                    href={`/request/${designer.id}?inspoUrl=${encodeURIComponent(activeProduct.image_url)}&styleTitle=${encodeURIComponent(activeProduct.title)}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-600/25 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Order Bespoke Custom</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
