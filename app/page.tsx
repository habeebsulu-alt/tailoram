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
} from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<'ranking' | 'rating' | 'reviews' | 'newest'>('ranking');

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
  }, [designers, searchQuery, selectedState, selectedArea, selectedCategory, sortBy]);

  // Day 1 Analytics: Log searches (debounced)
  useEffect(() => {
    const hasFilter =
      searchQuery.trim() !== '' ||
      selectedState !== 'All States' ||
      selectedArea !== 'All Areas' ||
      selectedCategory !== 'all';

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
          sort_by: sortBy,
          results_count: filteredAndRankedDesigners.length,
        },
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedState, selectedArea, selectedCategory, sortBy, filteredAndRankedDesigners.length, user]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedState('All States');
    setSelectedArea('All Areas');
    setSelectedCategory('all');
    setSortBy('ranking');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedState !== 'All States' ||
    selectedArea !== 'All Areas' ||
    selectedCategory !== 'all';

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

          {/* Luxury Highlights Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs font-bold text-stone-600">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
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

              return (
                <div
                  key={designer.id}
                  className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  
                  {/* Media Header Showcase */}
                  <div>
                    <div className="relative aspect-[16/11] bg-stone-100 overflow-hidden">
                      {latestItem ? (
                        latestItem.media_type === 'video' ? (
                          <video
                            src={latestItem.media_url}
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
                          <MapPin className="w-3 h-3 text-brand-600" />
                          {designer.area}, {designer.state}
                        </span>
                      )}

                      {/* Portfolio count */}
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide">
                        {portfolioItems.length} {portfolioItems.length === 1 ? 'Work' : 'Works'}
                      </span>
                    </div>

                    {/* Designer Details */}
                    <div className="p-6 space-y-3.5">
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
                  </div>

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

    </div>
  );
}
