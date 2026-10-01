'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { StoreProduct, STORE_CATEGORIES } from '@/lib/types';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  MapPin,
  Scissors,
  Phone,
  Send,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function ShopPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'newest'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('store_products')
          .select('*, designer:designer_id(*)')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Error fetching store products (table may need creation):', error.message);
        } else if (data) {
          setProducts(data as StoreProduct[]);
        }
      } catch (err) {
        console.error('Failed to load shop items:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = p.title?.toLowerCase().includes(query);
        const descMatch = p.description?.toLowerCase().includes(query);
        const designerMatch = p.designer?.business_name?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !designerMatch) return false;
      }

      if (selectedCategory !== 'all') {
        if (p.category !== selectedCategory) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0; // featured/default
    });
  }, [products, searchQuery, selectedCategory, sortBy]);

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryLabel = (catId: string) => {
    const found = STORE_CATEGORIES.find((c) => c.id === catId);
    return found ? found.label : 'Ready-to-Wear';
  };

  return (
    <div className="space-y-10 pb-24">

      {/* Editorial Shop Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-white to-stone-50/50 border-b border-stone-200/80 pt-12 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 text-stone-800 text-xs font-bold tracking-wide shadow-xs">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <span>Ready-to-Wear &amp; Traditional Garments</span>
            <span className="text-stone-300">•</span>
            <span className="text-brand-600 font-extrabold">Instant Commission</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
            Tailoram <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-amber-600">Studio Store</span>
          </h1>

          <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Purchase ready-to-ship Nigerian native garments, luxury lace sets, hand-dyed Adire, and custom Fila caps directly from verified studios nationwide.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
            >
              <Scissors className="w-3.5 h-3.5 text-brand-400" />
              <span>Sell in Your Studio Store</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ready-to-wear, agbada, senator, adire..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-50/50"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <ArrowUpDown className="w-3.5 h-3.5 absolute left-3.5 top-3.5 text-stone-400" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="featured">Featured First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newly Listed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {STORE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div>
          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-stone-500">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              <p className="text-sm font-bold">Loading Nigerian ready-to-wear items...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-14 text-center max-w-md mx-auto space-y-3">
              <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="text-lg font-bold text-stone-900">No products found</h3>
              <p className="text-xs text-stone-500">
                Try searching with different terms or reset your style filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
              >
                Show All Store Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const designer = product.designer;
                const cleanPhone = designer?.whatsapp?.replace(/[^0-9]/g, '');

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="group cursor-pointer bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-stone-900/85 backdrop-blur-sm text-white text-[10px] font-extrabold uppercase tracking-wider">
                        {getCategoryLabel(product.category)}
                      </span>

                      {/* Stock status */}
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold">
                        In Stock
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="p-5 space-y-3 flex flex-col justify-between flex-1">
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-lg font-black text-stone-900">
                            {formatNaira(product.price)}
                          </p>
                        </div>

                        <h3 className="font-bold text-sm text-stone-800 line-clamp-1 group-hover:text-brand-600 transition-colors">
                          {product.title}
                        </h3>

                        {product.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Sizes Pill */}
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[10px] font-semibold text-stone-400 mr-1">Sizes:</span>
                          {product.sizes.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-bold"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Tailor Studio info & Action */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        {designer ? (
                          <Link
                            href={`/designer/${designer.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-brand-600 font-semibold truncate max-w-[55%]"
                            title={`Tailored by ${designer.business_name}`}
                          >
                            <Scissors className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                            <span className="truncate">{designer.business_name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-stone-400">Verified Tailor</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${designer?.business_name || 'Tailor'}, I would like to buy your "${product.title}" (${formatNaira(product.price)}) on Tailoram.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Buy / Inquire via WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <Link
                            href={`/request/${designer?.id || ''}?inspoUrl=${encodeURIComponent(product.image_url)}&styleTitle=${encodeURIComponent(product.title)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                            title="Order or customize with your measurements"
                          >
                            <span>Buy / Order</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PRODUCT QUICK VIEW MODAL */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Product Image */}
            <div className="md:w-1/2 aspect-square md:aspect-auto bg-stone-100 relative">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product Details */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-[11px] font-bold uppercase tracking-wider">
                  {getCategoryLabel(selectedProduct.category)}
                </span>

                <h2 className="text-xl font-black text-stone-900 leading-tight">
                  {selectedProduct.title}
                </h2>

                <p className="text-2xl font-black text-brand-700">
                  {formatNaira(selectedProduct.price)}
                </p>

                {selectedProduct.description && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                    {selectedProduct.description}
                  </p>
                )}

                {selectedProduct.sizes && (
                  <div className="pt-2">
                    <p className="text-xs font-bold text-stone-700 mb-1">Available Sizes:</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedProduct.sizes.map((s) => (
                        <span key={s} className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Designer & Order Buttons */}
              <div className="pt-4 border-t border-stone-100 space-y-2.5">
                {selectedProduct.designer && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Tailored by:</span>
                    <Link
                      href={`/designer/${selectedProduct.designer.id}`}
                      className="font-bold text-stone-900 hover:text-brand-600 flex items-center gap-1"
                    >
                      {selectedProduct.designer.business_name}
                      <ExternalLink className="w-3 h-3 text-stone-400" />
                    </Link>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {selectedProduct.designer?.whatsapp && (
                    <a
                      href={`https://wa.me/${selectedProduct.designer.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedProduct.designer.business_name}, I want to purchase "${selectedProduct.title}" (${formatNaira(selectedProduct.price)}) from your Tailoram store.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  )}

                  <Link
                    href={`/request/${selectedProduct.designer?.id || ''}?inspoUrl=${encodeURIComponent(selectedProduct.image_url)}&styleTitle=${encodeURIComponent(selectedProduct.title)}`}
                    className="flex-1 py-3 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Order Bespoke</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
