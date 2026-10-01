'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

const NIGERIAN_HUBS = [
  { state: 'Lagos', name: 'Lagos', desc: 'Lekki, Ikeja, VI, Yaba, Surulere', lat: 6.5244, lng: 3.3792 },
  { state: 'Abuja (FCT)', name: 'Abuja', desc: 'Maitama, Wuse II, Garki, Jabi', lat: 9.0765, lng: 7.3986 },
  { state: 'Rivers (Port Harcourt)', name: 'Port Harcourt', desc: 'Old GRA, Peter Odili, D-Line', lat: 4.8156, lng: 7.0498 },
  { state: 'Oyo (Ibadan)', name: 'Ibadan', desc: 'Bodija, Ring Road, Jericho', lat: 7.3775, lng: 3.9470 },
  { state: 'Kano', name: 'Kano', desc: 'Nassarawa GRA, Bompai, City Center', lat: 12.0022, lng: 8.5920 },
  { state: 'Enugu', name: 'Enugu', desc: 'Independence Layout, New Haven, GRA', lat: 6.4584, lng: 7.5464 },
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

export default function HomePage() {
  const { user } = useAuth();

  // Designers state
  const [designers, setDesigners] = useState<DesignerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'ranking' | 'rating' | 'reviews' | 'newest'>('ranking');

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
          // Process ratings and reviews
          const processed = (data as any[]).map((d) => {
            const revs = d.reviews || [];
            const reviewCount = revs.length;
            const avgRating =
              reviewCount > 0
                ? revs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewCount
                : 0;

            return {
              ...d,
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

    // 2. Sort by Ranking System
    return filtered.sort((a: any, b: any) => {
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
  }, [designers, searchQuery, selectedState, selectedArea, selectedCategory, selectedGender, sortBy]);

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
    <div className="space-y-12 pb-24">
      
      {/* Luxury Editorial Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-white to-stone-50/50 border-b border-stone-200/80 pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-brand-50/20 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 text-stone-800 text-xs font-bold tracking-wide shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Nigeria&apos;s Bespoke Fashion Network
            <span className="text-stone-300">•</span>
            <span className="text-brand-600 font-extrabold">All 36 States</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-stone-950 tracking-tight leading-[1.1]">
            Find &amp; Commission the Finest <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-amber-600 to-amber-700">
              Bespoke Tailors in Nigeria
            </span>
          </h1>

          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Browse real portfolios, read verified client reviews, compare rankings, and commission bespoke Agbada, Aso Ebi, Ankara styles, and Senator suits.
          </p>

          {/* Action Choices: View Designers Around Me vs Explore All Designers vs Explore the Shop */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={handleFindAroundMe}
              disabled={geoLocating}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-brand-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 group"
            >
              {geoLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Locating Studios Near You...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Navigation className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>View Designers Around Me</span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    Nearby
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleExploreAll}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 active:scale-[0.98] text-stone-900 font-extrabold text-sm sm:text-base border-2 border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <Compass className="w-4 h-4 text-amber-500 group-hover:rotate-45 transition-transform" />
              <span>Explore All Designers</span>
              <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">
                {designers.length}
              </span>
            </button>

            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Explore the Shop</span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                RTW
              </span>
            </Link>
          </div>

          {/* Luxury Highlights Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-3 text-xs font-bold text-stone-600">
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-stone-200/80 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Ranked by Verified Client Feedback</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-stone-200/80 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Direct In-App Tailor Chat</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-stone-200/80 shadow-xs">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Zero Placement Fee (100% Free)</span>
            </div>
          </div>

        </div>
      </section>

      {/* SEARCH, FILTERS & RANKING BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-5">
          
          {/* Main search and location inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
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
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-stone-800"
              >
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
              Showing {filteredAndRankedDesigners.length} designers sorted by {sortBy === 'ranking' ? 'top ranking' : sortBy}
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
              const portfolioItems = designer.portfolio_items || [];
              const latestItem = portfolioItems[0];
              const cleanPhone = designer.whatsapp?.replace(/[^0-9]/g, '');
              const isTopThree = index < 3 && designer.avg_rating >= 4.0;
              const genderFocus = getDesignerGender(designer);
              const genderBadge = GENDER_FOCUS_OPTIONS.find((g) => g.id === genderFocus);

              return (
                <div
                  key={designer.id}
                  className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  
                  {/* Clickable Media & Profile Card - Links to Designer Profile */}
                  <Link
                    href={`/designer/${designer.id}`}
                    className="block cursor-pointer flex-1"
                  >
                    <div className="relative aspect-[16/11] bg-stone-100 overflow-hidden">
                      {latestItem ? (
                        latestItem.media_type === 'video' ? (
                          <video
                            src={latestItem.media_url}
                            muted
                            playsInline
                            autoPlay
                            loop
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={latestItem.media_url}
                            alt={latestItem.caption || designer.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 to-stone-100 text-stone-400">
                          <Scissors className="w-8 h-8 text-brand-400" />
                          <span className="text-[11px] font-bold">New Studio</span>
                        </div>
                      )}

                      {/* Rank / Top Rated Badge */}
                      {isTopThree && (
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-500/95 backdrop-blur-sm text-white text-[11px] font-black flex items-center gap-1 shadow-sm">
                          <Trophy className="w-3.5 h-3.5 fill-white" />
                          #{index + 1} Top Rated
                        </span>
                      )}

                      {!isTopThree && (
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-stone-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                          <MapPin className="w-3.5 h-3.5 text-brand-600" />
                          {designer.area}, {designer.state}
                        </span>
                      )}

                      {/* Gender Wear Tag Badge on Media */}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs border ${
                        genderFocus === 'male'
                          ? 'bg-blue-950/85 text-blue-200 border-blue-400/40'
                          : genderFocus === 'female'
                          ? 'bg-rose-950/85 text-rose-200 border-rose-400/40'
                          : 'bg-purple-950/85 text-purple-200 border-purple-400/40'
                      }`}>
                        {genderBadge?.icon} {genderBadge?.tag}
                      </span>

                      {/* Portfolio count */}
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide">
                        {portfolioItems.length} {portfolioItems.length === 1 ? 'Work' : 'Works'}
                      </span>
                    </div>

                    {/* Designer Details */}
                    <div className="p-6 space-y-3">
                      {/* Gender Wear Tag & Studio Store Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          genderFocus === 'male'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : genderFocus === 'female'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
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
                        <div>
                          <h3 className="text-xl font-black text-stone-900 group-hover:text-brand-600 transition-colors leading-tight">
                            {designer.business_name}
                          </h3>
                          {designer.profiles?.full_name && (
                            <p className="text-xs text-stone-400 font-medium">
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
  );
}
