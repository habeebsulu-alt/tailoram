'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import EntrySplash from '@/components/EntrySplash';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import {
  DesignerProfile,
  NIGERIAN_STATES,
  STATE_AREAS,
  FASHION_CATEGORIES,
  GENDER_FOCUS_OPTIONS,
  getDesignerGender,
} from '@/lib/types';
import {
  Scissors,
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  Phone,
  Eye,
  Send,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Star,
  Trophy,
  Flame,
  Clock,
  ArrowUpDown,
  Navigation,
  Compass,
  ShoppingBag,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NIGERIAN_HUBS = [
  { state: 'Lagos', name: 'Lagos', desc: 'Lekki, Ikeja, VI, Yaba, Surulere', lat: 6.5244, lng: 3.3792 },
  { state: 'Abuja (FCT)', name: 'Abuja', desc: 'Maitama, Wuse II, Garki, Jabi', lat: 9.0765, lng: 7.3986 },
  { state: 'Rivers (Port Harcourt)', name: 'Port Harcourt', desc: 'Old GRA, Peter Odili, D-Line', lat: 4.8156, lng: 7.0498 },
  { state: 'Oyo (Ibadan)', name: 'Ibadan', desc: 'Bodija, Ring Road, Jericho', lat: 7.3775, lng: 3.9470 },
  { state: 'Kano', name: 'Kano', desc: 'Nassarawa GRA, Bompai, City Center', lat: 12.0022, lng: 8.5920 },
  { state: 'Enugu', name: 'Enugu', desc: 'Independence Layout, New Haven, GRA', lat: 6.4584, lng: 7.5464 },
];

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1572495532056-8583af1cbae0?auto=format&fit=crop&w=1920&q=85',
    title: 'Agbada & Senator Couture',
    tag: 'Royal Embroidery',
    location: 'Lagos & Abuja Masters',
  },
  {
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1920&q=85',
    title: 'Owambe & Corset Lace',
    tag: 'Bespoke Aso Ebi',
    location: 'Celebration Glamour',
  },
  {
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=85',
    title: 'Sharp Executive RTW',
    tag: 'Contemporary Cuts',
    location: 'Ready-to-Wear Studios',
  },
  {
    image: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1920&q=85',
    title: 'Heritage Adire & Ankara',
    tag: 'Artisan Textile Craft',
    location: 'Indigenous Heritage',
  },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function hashString(str: string, seed: number = 42): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

interface DesignerCardProps {
  designer: any;
  index: number;
  isTopThree: boolean;
  cleanPhone: string | null;
  genderFocus: 'male' | 'female' | 'unisex';
  genderBadge: any;
}

function DesignerMarketplaceCard({
  designer,
  index,
  isTopThree,
  cleanPhone,
  genderFocus,
  genderBadge,
}: DesignerCardProps) {
  const portfolioItems = useMemo(() => designer.portfolio_items || [], [designer.portfolio_items]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Slideshow timer on hover or keyboard focus
  useEffect(() => {
    if (!isHovered || portfolioItems.length <= 1) return;

    const interval = setInterval(() => {
      setActiveMediaIndex((prev) => (prev + 1) % portfolioItems.length);
    }, 1700);

    return () => clearInterval(interval);
  }, [isHovered, portfolioItems.length]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveMediaIndex(0);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMediaIndex((prev) => (prev - 1 + portfolioItems.length) % portfolioItems.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMediaIndex((prev) => (prev + 1) % portfolioItems.length);
  };

  return (
    <div
      className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* Clickable Media & Profile Card - Links to Designer Profile */}
      <Link href={`/designer/${designer.id}`} className="block cursor-pointer flex-1">
        <div className="relative aspect-[16/11] bg-stone-950 overflow-hidden">
          {portfolioItems.length > 0 ? (
            portfolioItems.map((item: any, idx: number) => {
              const isActive = idx === activeMediaIndex;
              return (
                <div
                  key={item.id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {item.media_type === 'video' ? (
                    <video
                      src={item.media_url}
                      muted
                      playsInline
                      autoPlay
                      loop
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.caption || designer.business_name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  )}
                  {/* Subtle dark bottom vignette for luxury contrast and badge legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                </div>
              );
            })
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 to-stone-100 text-stone-400">
              <Scissors className="w-8 h-8 text-brand-400" />
              <span className="text-[11px] font-bold">New Studio</span>
            </div>
          )}

          {/* Story-style Progress Indicator Bars on Hover / Multiple items */}
          {portfolioItems.length > 1 && (
            <div className="absolute top-2 inset-x-3 z-30 flex items-center gap-1 opacity-90 transition-opacity">
              {portfolioItems.slice(0, 8).map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    idx === activeMediaIndex
                      ? 'bg-amber-400 shadow-sm'
                      : 'bg-white/40 backdrop-blur-xs'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick manual navigation arrows on hover */}
          {isHovered && portfolioItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs shadow-lg transition-all active:scale-90"
                aria-label="Previous work"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs shadow-lg transition-all active:scale-90"
                aria-label="Next work"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Rank / Top Rated Badge */}
          {isTopThree && (
            <span className="absolute top-4 left-3 px-3 py-1 rounded-full bg-amber-500/95 backdrop-blur-sm text-white text-[11px] font-black flex items-center gap-1 shadow-sm z-20">
              <Trophy className="w-3.5 h-3.5 fill-white" />
              #{index + 1} Top Rated
            </span>
          )}

          {!isTopThree && (
            <span className="absolute top-4 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-stone-800 text-[11px] font-bold flex items-center gap-1 shadow-xs z-20">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              {designer.area}, {designer.state}
            </span>
          )}

          {/* Gender Wear Tag Badge on Media */}
          <span
            className={`absolute top-4 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs border z-20 ${
              genderFocus === 'male'
                ? 'bg-blue-950/85 text-blue-200 border-blue-400/40'
                : genderFocus === 'female'
                ? 'bg-rose-950/85 text-rose-200 border-rose-400/40'
                : 'bg-purple-950/85 text-purple-200 border-purple-400/40'
            }`}
          >
            {genderBadge?.icon} {genderBadge?.tag}
          </span>

          {/* Studio Profile Picture Badge on Image Card */}
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-stone-900 group-hover:scale-105 transition-transform duration-300 ring-2 ring-black/20">
              {designer.profile_image_url ? (
                <img
                  src={designer.profile_image_url}
                  alt={designer.business_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-600 to-amber-600 text-white flex items-center justify-center font-black text-base shadow-inner">
                  {designer.business_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {designer.is_verified && (
              <span
                title="Verified Studio"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-md"
              >
                <CheckCircle2 className="w-3 h-3 fill-white text-emerald-500" />
              </span>
            )}
          </div>

          {/* Portfolio count / dynamic active slide counter */}
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide z-20 flex items-center gap-1 shadow-sm">
            {portfolioItems.length > 1 ? (
              <>
                <span className="text-amber-400 font-black">{activeMediaIndex + 1}</span>
                <span className="text-stone-300">/{portfolioItems.length} Works</span>
              </>
            ) : (
              <span>{portfolioItems.length} {portfolioItems.length === 1 ? 'Work' : 'Works'}</span>
            )}
          </span>
        </div>

        {/* Designer Details */}
        <div className="p-6 space-y-3">
          {/* Gender Wear Tag & Studio Store Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                genderFocus === 'male'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : genderFocus === 'female'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-purple-50 text-purple-800 border-purple-200'
              }`}
            >
              {genderBadge?.icon} {genderBadge?.tag}
            </span>
            {designer.has_store && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <ShoppingBag className="w-2.5 h-2.5 text-amber-600" />
                Studio Store
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-stone-900 group-hover:text-brand-600 transition-colors leading-tight truncate">
                  {designer.business_name}
                </h3>
                {designer.is_verified && (
                  <span
                    title="Tailoram Verified Studio"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
                {designer.is_featured && (
                  <span
                    title="Featured Showcase"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Featured</span>
                  </span>
                )}
              </div>
              {designer.profiles?.full_name && (
                <p className="text-xs text-stone-400 font-medium truncate mt-0.5">
                  Tailor: {designer.profiles.full_name}
                </p>
              )}
            </div>

            {/* Star Rating Badge */}
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="text-xs font-black text-amber-900">
                {designer.review_count > 0 ? designer.avg_rating.toFixed(1) : 'New'}
              </span>
              {designer.review_count > 0 && (
                <span className="text-[10px] text-amber-700 font-semibold">
                  ({designer.review_count})
                </span>
              )}
            </div>
          </div>

          {designer.bio && (
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
              {designer.bio}
            </p>
          )}

          {/* Specialty tags */}
          {designer.categories && designer.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {designer.categories.slice(0, 3).map((cat: string) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700"
                >
                  {cat.replace('_', ' ')}
                </span>
              ))}
              {designer.categories.length > 3 && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-stone-100 text-stone-400">
                  +{designer.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Action Bar */}
      <div className="p-6 pt-0 border-t border-stone-100 mt-2 flex items-center gap-2">
        <Link
          href={`/designer/${designer.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          View Portfolio
        </Link>

        <Link
          href={`/request/${designer.id}`}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          Request
        </Link>

        {cleanPhone && (
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-2xl border border-stone-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Chat on WhatsApp"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  // Hero Background Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  useEffect(() => {
    if (isSliderPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isSliderPaused]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  // Designers state
  const [designers, setDesigners] = useState<DesignerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'all' | 'ranking' | 'rating' | 'reviews' | 'newest'>('ranking');
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 100000));

  // Geolocation & Around Me state
  const [geoLocating, setGeoLocating] = useState(false);
  const [nearMeLocation, setNearMeLocation] = useState<string | null>(null);
  const [nearMeModalOpen, setNearMeModalOpen] = useState(false);

  // Load all designers with portfolio items and reviews
  useEffect(() => {
    async function fetchDesigners() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('designer_profiles')
          .select('*, profiles:user_id(full_name), portfolio_items(*), reviews(*)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching designers:', error);
        } else if (data) {
          const deletedIds: string[] = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('tailoram_deleted_portfolio_items') || '[]')
            : [];

          // Process ratings and reviews
          const processed = (data as any[]).map((d) => {
            const revs = d.reviews || [];
            const reviewCount = revs.length;
            const avgRating =
              reviewCount > 0
                ? revs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewCount
                : 0;

            const filteredItems = (d.portfolio_items || []).filter(
              (p: any) => !deletedIds.includes(p.id)
            );

            const localAvatar = typeof window !== 'undefined'
              ? localStorage.getItem(`tailoram_avatar_${d.id}`)
              : null;

            return {
              ...d,
              portfolio_items: filteredItems,
              profile_image_url: d.profile_image_url || localAvatar || null,
              avg_rating: avgRating,
              review_count: reviewCount,
              // Ranking score: weighted by rating and log-scaled volume of reviews
              ranking_score: avgRating * Math.log10(reviewCount + 1),
            };
          });

          setDesigners(processed as DesignerProfile[]);
        }
      } catch (err) {
        console.error('Failed to load marketplace designers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDesigners();
  }, []);

  // Update area when state changes
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedArea('All Areas');
  };

  // Available areas based on selected state
  const availableAreas = useMemo(() => {
    if (selectedState === 'All States' || !STATE_AREAS[selectedState]) {
      return [];
    }
    return STATE_AREAS[selectedState];
  }, [selectedState]);

  // Filtered & Ranked designers
  const filteredAndRankedDesigners = useMemo(() => {
    // 1. Filter
    const filtered = designers.filter((d: any) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const brandMatch = d.business_name?.toLowerCase().includes(query);
        const bioMatch = d.bio?.toLowerCase().includes(query);
        const areaMatch = d.area?.toLowerCase().includes(query);
        const stateMatch = d.state?.toLowerCase().includes(query);
        const catMatch = d.categories?.some((c: string) => c.toLowerCase().includes(query));
        if (!brandMatch && !bioMatch && !areaMatch && !stateMatch && !catMatch) {
          return false;
        }
      }

      if (selectedState !== 'All States') {
        if (d.state !== selectedState) return false;
      }

      if (selectedArea !== 'All Areas') {
        if (d.area !== selectedArea) return false;
      }

      if (selectedCategory !== 'all') {
        if (!d.categories || !d.categories.includes(selectedCategory)) {
          return false;
        }
      }

      if (selectedGender !== 'all') {
        const dGender = getDesignerGender(d);
        if (dGender !== selectedGender) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort by Ranking System or Random Discovery
    return filtered.sort((a: any, b: any) => {
      if (sortBy === 'all') {
        // Random discovery shuffle using deterministic hash with randomSeed
        const hashA = hashString(a.id, randomSeed);
        const hashB = hashString(b.id, randomSeed);
        return hashA - hashB;
      }
      if (sortBy === 'ranking') {
        // Top ranked based on score, then review count
        if (b.ranking_score !== a.ranking_score) {
          return (b.ranking_score || 0) - (a.ranking_score || 0);
        }
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      }
      if (sortBy === 'rating') {
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      }
      if (sortBy === 'reviews') {
        return (b.review_count || 0) - (a.review_count || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
  }, [designers, searchQuery, selectedState, selectedArea, selectedCategory, selectedGender, sortBy, randomSeed]);

  // Day 1 Analytics: Log searches (debounced)
  useEffect(() => {
    const hasFilter =
      searchQuery.trim() !== '' ||
      selectedState !== 'All States' ||
      selectedArea !== 'All Areas' ||
      selectedCategory !== 'all' ||
      selectedGender !== 'all';

    if (!hasFilter) return;

    const timer = setTimeout(() => {
      logEvent({
        event_type: 'search',
        user_id: user?.id || null,
        metadata: {
          query: searchQuery.trim() || null,
          state: selectedState,
          area: selectedArea,
          category: selectedCategory,
          gender: selectedGender,
          sort_by: sortBy,
          results_count: filteredAndRankedDesigners.length,
        },
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedState, selectedArea, selectedCategory, selectedGender, sortBy, filteredAndRankedDesigners.length, user]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedState('All States');
    setSelectedArea('All Areas');
    setSelectedCategory('all');
    setSelectedGender('all');
    setSortBy('ranking');
    setNearMeLocation(null);
  };

  const handleFindAroundMe = () => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setNearMeModalOpen(true);
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocating(false);
        const { latitude, longitude } = position.coords;

        let closestHub = NIGERIAN_HUBS[0];
        let minDistance = Infinity;

        for (const hub of NIGERIAN_HUBS) {
          const dist = getDistance(latitude, longitude, hub.lat, hub.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestHub = hub;
          }
        }

        setSelectedState(closestHub.state);
        setSelectedArea('All Areas');
        setNearMeLocation(closestHub.name);

        const element = document.getElementById('marketplace-designers');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      },
      (error) => {
        console.warn('Geolocation denied or unavailable:', error);
        setGeoLocating(false);
        setNearMeModalOpen(true);
      },
      { timeout: 7000 }
    );
  };

  const handleSelectCityNearMe = (stateName: string, cityName: string) => {
    setSelectedState(stateName);
    setSelectedArea('All Areas');
    setNearMeLocation(cityName);
    setNearMeModalOpen(false);

    const element = document.getElementById('marketplace-designers');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreAll = () => {
    resetFilters();
    setNearMeLocation(null);
    const element = document.getElementById('marketplace-designers');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedState !== 'All States' ||
    selectedArea !== 'All Areas' ||
    selectedCategory !== 'all' ||
    selectedGender !== 'all';

  return (
    <>
      <EntrySplash />
      <div className="space-y-12 pb-24">
      
      {/* Luxury Editorial Hero Section with Ambient Background Slider */}
      <section
        className="relative overflow-hidden bg-stone-950 text-white border-b border-stone-800/80 pt-16 pb-16 px-4 sm:px-6 lg:px-8 transition-colors duration-700"
        onMouseEnter={() => setIsSliderPaused(true)}
        onMouseLeave={() => setIsSliderPaused(false)}
      >
        {/* Background Slides with Smooth Crossfade and Ken Burns Effect */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className={`w-full h-full object-cover object-center transform transition-transform duration-[7000ms] ease-out ${
                  idx === currentSlide ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          ))}

          {/* Deep luxury gradient overlays to ensure 100% text legibility */}
          <div className="absolute inset-0 bg-stone-950/75 sm:bg-stone-950/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/80" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Nigeria&apos;s Bespoke Fashion Network
            <span className="text-white/40">•</span>
            <span className="text-amber-300 font-extrabold">All 36 States</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-md">
            Find &amp; Commission the Finest <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-brand-300 to-amber-400">
              Bespoke Tailors in Nigeria
            </span>
          </h1>

          <p className="text-base sm:text-lg text-stone-200 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-sm">
            Browse real portfolios, read verified client reviews, compare rankings, and commission bespoke Agbada, Aso Ebi, Ankara styles, and Senator suits.
          </p>

          {/* Action Choices: View Designers Around Me vs Explore All Designers vs Explore the Shop */}
          <div className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap items-center justify-center gap-3 sm:gap-3.5 pt-2">
            <button
              onClick={handleFindAroundMe}
              disabled={geoLocating}
              className="w-full sm:w-auto h-12 sm:h-13 px-5 sm:px-6 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-extrabold text-sm shadow-xl shadow-brand-900/40 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 whitespace-nowrap group"
            >
              {geoLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>Locating Studios Near You...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-white shrink-0" />
                  <span>Designers Around Me</span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Nearby
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleExploreAll}
              className="w-full sm:w-auto h-12 sm:h-13 px-5 sm:px-6 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white font-extrabold text-sm border border-white/30 backdrop-blur-md shadow-lg transition-all flex items-center justify-center gap-2.5 whitespace-nowrap group"
            >
              <Compass className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform shrink-0" />
              <span>Explore All Designers</span>
              <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                {designers.length}
              </span>
            </button>

            <Link
              href="/shop"
              className="w-full sm:w-auto h-12 sm:h-13 px-5 sm:px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 whitespace-nowrap group"
            >
              <ShoppingBag className="w-4 h-4 text-stone-950 shrink-0" />
              <span>Explore the Shop</span>
              <span className="text-[11px] bg-stone-950/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                RTW
              </span>
            </Link>
          </div>

          {/* Interactive Slide Ticker & Switcher */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 pt-1">
            <button
              onClick={handlePrevSlide}
              aria-label="Previous couture style"
              className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/90 font-medium shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-extrabold text-amber-300">{HERO_SLIDES[currentSlide].tag}</span>
              <span className="text-white/40">•</span>
              <span className="text-stone-200 hidden sm:inline">{HERO_SLIDES[currentSlide].title}</span>
              <span className="text-white/40 hidden sm:inline">•</span>
              <span className="text-stone-300 text-[11px]">{HERO_SLIDES[currentSlide].location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to couture style ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-6 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextSlide}
              aria-label="Next couture style"
              className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Luxury Highlights Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 text-xs font-bold text-stone-200">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Ranked by Verified Client Feedback</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Direct In-App Tailor Chat</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 shadow-xs">
              <Sparkles className="w-4 h-4 text-brand-300" />
              <span>Zero Placement Fee (100% Free)</span>
            </div>
          </div>

        </div>
      </section>

      {/* SEARCH, FILTERS & RANKING BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-5">
          
          {/* Main search, gender, location and ranking inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Text Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search designer, style, or garment..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-50/50 placeholder:text-stone-400"
              />
            </div>

            {/* Gender / Audience Dropdown */}
            <div className="relative">
              <Users className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-stone-700 font-medium"
              >
                <option value="all">All Genders &amp; Wear</option>
                <option value="male">♂ Men&apos;s Wear</option>
                <option value="female">♀ Women&apos;s Wear</option>
                <option value="unisex">⚧ Unisex &amp; Mixed</option>
              </select>
            </div>

            {/* State Filter */}
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-stone-700 font-medium"
              >
                <option value="All States">All Nigerian States</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Area Filter */}
            <div>
              <select
                disabled={selectedState === 'All States' || availableAreas.length === 0}
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-stone-100 disabled:text-stone-400 font-medium text-stone-700"
              >
                <option value="All Areas">
                  {selectedState === 'All States' ? 'Select state first' : `All Areas in ${selectedState}`}
                </option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Ranking / Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e: any) => {
                  if (e.target.value === 'all') {
                    setRandomSeed(Math.floor(Math.random() * 100000));
                  }
                  setSortBy(e.target.value);
                }}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-stone-800"
              >
                <option value="all">🎲 All Designers (Discover / Random)</option>
                <option value="ranking">🏆 Highest Ranking (Top Rated)</option>
                <option value="rating">⭐ Highest Average Stars</option>
                <option value="reviews">🔥 Most Client Reviews</option>
                <option value="newest">✨ Newest Designers</option>
              </select>
            </div>

          </div>

          {/* Gender Audience Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] flex-shrink-0">
              Audience:
            </span>
            {GENDER_FOCUS_OPTIONS.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGender(g.id)}
                className={`px-3 py-1.5 rounded-xl font-bold flex-shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedGender === g.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-stone-100/80 text-stone-700 hover:bg-stone-200/80'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] flex-shrink-0">
              Style:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold flex-shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100/80 text-stone-700 hover:bg-stone-200/80'
              }`}
            >
              All Garments
            </button>
            {FASHION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? 'all' : cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex-shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-stone-100/80 text-stone-700 hover:bg-stone-200/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Active Filter summary */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
              <span className="text-stone-600">
                Found <strong className="text-stone-900">{filteredAndRankedDesigners.length}</strong> matching designer
                {filteredAndRankedDesigners.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-800"
              >
                <X className="w-3.5 h-3.5" />
                Reset all filters
              </button>
            </div>
          )}

        </div>
      </section>

      {/* DESIGNERS MARKETPLACE & RANKINGS GRID */}
      <section id="marketplace-designers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Active Proximity / Around Me Notification Banner */}
        {nearMeLocation && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-amber-50 border border-brand-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-200/70 text-brand-800">
                    Proximity Filter Active
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    {filteredAndRankedDesigners.length} Studios in Region
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-900 mt-0.5">
                  Showing verified bespoke tailors around {nearMeLocation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setNearMeModalOpen(true)}
                className="text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs transition-colors"
              >
                Change Location
              </button>
              <button
                onClick={handleExploreAll}
                className="text-xs font-bold text-brand-700 hover:text-white bg-white hover:bg-brand-600 px-3 py-1.5 rounded-xl border border-brand-200 shadow-2xs transition-all"
              >
                View All Nationwide
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Tailor Rankings &amp; Directory
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Showing {filteredAndRankedDesigners.length} designers sorted by {
                sortBy === 'all'
                  ? 'random discovery'
                  : sortBy === 'ranking'
                  ? 'top ranking'
                  : sortBy
              }
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-stone-500">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-bold">Curating top Nigerian designers...</p>
          </div>
        ) : filteredAndRankedDesigners.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-14 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                No designers found matching your criteria
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Try widening your search, choosing another state or neighborhood, or resetting your filters.
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              Show All Designers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredAndRankedDesigners.map((designer: any, index: number) => {
              const cleanPhone = designer.whatsapp?.replace(/[^0-9]/g, '');
              const isTopThree = index < 3 && designer.avg_rating >= 4.0;
              const genderFocus = getDesignerGender(designer);
              const genderBadge = GENDER_FOCUS_OPTIONS.find((g) => g.id === genderFocus);

              return (
                <DesignerMarketplaceCard
                  key={designer.id}
                  designer={designer}
                  index={index}
                  isTopThree={isTopThree}
                  cleanPhone={cleanPhone}
                  genderFocus={genderFocus}
                  genderBadge={genderBadge}
                />
              );
            })}
          </div>
        )}

      </section>

      {/* Location Picker Modal (Fallback / Manual City Select) */}
      {nearMeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-stone-900">
                    Find Designers Around You
                  </h3>
                  <p className="text-xs text-stone-500">
                    Select your city or closest Nigerian fashion hub
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNearMeModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NIGERIAN_HUBS.map((hub) => (
                <button
                  key={hub.state}
                  onClick={() => handleSelectCityNearMe(hub.state, hub.name)}
                  className="p-3.5 rounded-2xl border border-stone-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900 group-hover:text-brand-700">
                      {hub.name}
                    </span>
                    <MapPin className="w-4 h-4 text-stone-400 group-hover:text-brand-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                    {hub.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setNearMeModalOpen(false);
                  handleExploreAll();
                }}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Browse All 36 States Instead
              </button>

              <button
                onClick={() => setNearMeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
