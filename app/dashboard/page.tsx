'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';
import { logEvent } from '@/lib/analytics';
import {
  PortfolioItem,
  OutfitRequest,
  Review,
  NIGERIAN_STATES,
  STATE_AREAS,
  FASHION_CATEGORIES,
  StoreProduct,
  STORE_CATEGORIES,
} from '@/lib/types';
import {
  Scissors,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Save,
  MapPin,
  Phone,
  Sparkles,
  Loader2,
  Inbox,
  Star,
  MessageSquare,
  Clock,
  XCircle,
  Check,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Package,
} from 'lucide-react';

export default function DesignerDashboard() {
  const router = useRouter();
  const { user, profile, designerProfile, refreshProfile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'portfolio' | 'requests' | 'reviews' | 'profile' | 'store'>('portfolio');

  // Portfolio items state
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Store products state
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);
  const [hasStore, setHasStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);
  const [storeMessage, setStoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New product modal & form state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('ready_to_wear');
  const [productSizes, setProductSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [productDescription, setProductDescription] = useState('');
  const [productInStock, setProductInStock] = useState(true);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Requests state
  const [requests, setRequests] = useState<OutfitRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'declined'>('all');
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Upload modal & form state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'image' | 'video'>('image');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadCategory, setUploadCategory] = useState('agbada');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile state
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [area, setArea] = useState('Ikeja');
  const [whatsapp, setWhatsapp] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Delete item state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Populate profile fields when designerProfile loads
  useEffect(() => {
    if (designerProfile) {
      setBusinessName(designerProfile.business_name || '');
      setBio(designerProfile.bio || '');
      setSelectedState(designerProfile.state || 'Lagos');
      setArea(designerProfile.area || 'Ikeja');
      setWhatsapp(designerProfile.whatsapp || '');
      setCategories(designerProfile.categories || ['native_wear']);
      setHasStore(Boolean(designerProfile.has_store));
      setStoreName(designerProfile.store_name || '');
    }
  }, [designerProfile]);

  // Load portfolio items
  const loadPortfolio = async (designerId: string) => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading portfolio:', error);
      } else {
        setItems(data as PortfolioItem[]);
      }
    } catch (err) {
      console.error('Failed to load portfolio items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Load requests
  const loadRequests = async (designerId: string) => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*, client:client_id(full_name)')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data as OutfitRequest[]);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load reviews
  const loadReviews = async (designerId: string) => {
    try {
      setLoadingReviews(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*, client:client_id(full_name)')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReviews(data as Review[]);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Load store products
  const loadStoreProducts = async (designerId: string) => {
    try {
      setLoadingStore(true);
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading store products:', error);
      } else {
        setStoreProducts((data as StoreProduct[]) || []);
      }
    } catch (err) {
      console.error('Failed to load store products:', err);
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (designerProfile?.id) {
      loadPortfolio(designerProfile.id);
      loadRequests(designerProfile.id);
      loadReviews(designerProfile.id);
      loadStoreProducts(designerProfile.id);
    }
  }, [user, designerProfile, authLoading, router]);

  // Handle state change for area list
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const available = STATE_AREAS[newState];
    if (available && available.length > 0) {
      setArea(available[0]);
    } else {
      setArea('General Area');
    }
  };

  // Toggle category pills
  const toggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== catId));
      }
    } else {
      setCategories([...categories, catId]);
    }
  };

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/');

      // Check max file sizes (40MB for video, 15MB for photo)
      if (isVideo && file.size > 40 * 1024 * 1024) {
        setUploadError('Video file exceeds 40MB limit. Please choose a shorter clip for fast Nigerian mobile playback.');
        return;
      }
      if (!isVideo && file.size > 15 * 1024 * 1024) {
        setUploadError('Photo file is too large (max 15MB).');
        return;
      }

      setUploadFile(file);
      setUploadMediaType(isVideo ? 'video' : 'image');
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload Portfolio Item
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select an outfit photo or short video clip to upload.');
      return;
    }
    if (!designerProfile?.id) {
      setUploadError('Designer profile not found. Please refresh and try again.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      setUploadSuccess('');

      const isVideo = uploadFile.type.startsWith('video/') || uploadMediaType === 'video';
      const mediaType = isVideo ? 'video' : 'image';

      let finalFile: File = uploadFile;
      if (!isVideo) {
        finalFile = await compressImage(uploadFile, 1400, 1400, 0.82);
      }

      const fileExt = finalFile.name.split('.').pop() || (isVideo ? 'mp4' : 'webp');
      const fileName = `${designerProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, finalFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: isVideo ? uploadFile.type || 'video/mp4' : 'image/webp',
        });

      if (storageError) {
        if (storageError.message.includes('Bucket not found')) {
          throw new Error(
            'The "portfolio" storage bucket has not been created yet in Supabase. Please go to Supabase Dashboard -> Storage -> Create new bucket named "portfolio" (Public: Yes).'
          );
        }
        throw storageError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('portfolio').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('portfolio_items').insert([
        {
          designer_id: designerProfile.id,
          media_url: publicUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
          category: uploadCategory,
        },
      ]);

      if (dbError) throw dbError;

      setUploadSuccess('Portfolio item added successfully!');
      setUploadFile(null);
      setPreviewUrl(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadPortfolio(designerProfile.id);

      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccess('');
      }, 1200);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Portfolio Item
  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      setDeletingId(item.id);

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      try {
        const parts = item.media_url.split('/portfolio/');
        if (parts.length > 1) {
          const storagePath = parts[1];
          await supabase.storage.from('portfolio').remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn('Could not remove file from storage:', storageErr);
      }

      setItems(items.filter((i) => i.id !== item.id));
    } catch (err: any) {
      alert(`Could not delete item: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Update Request Status (Accept, Decline, Complete)
  const handleUpdateStatus = async (requestId: string, newStatus: OutfitRequest['status']) => {
    try {
      setUpdatingRequestId(requestId);

      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      // Log analytics event
      logEvent({
        event_type: 'request_status_change',
        user_id: user?.id,
        designer_id: designerProfile?.id,
        metadata: {
          request_id: requestId,
          new_status: newStatus,
        },
      });

      // Update local state
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      console.error('Failed to update request status:', err);
      alert('Could not update status: ' + err.message);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  // Save Profile Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerProfile?.id) return;

    try {
      setSavingProfile(true);
      setProfileSuccess('');
      setProfileError('');

      const { error } = await supabase
        .from('designer_profiles')
        .update({
          business_name: businessName.trim(),
          bio: bio.trim() || null,
          state: selectedState,
          city: selectedState,
          area: area,
          whatsapp: whatsapp.trim() || null,
          categories: categories,
        })
        .eq('id', designerProfile.id);

      if (error) throw error;

      await refreshProfile();
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Store Settings (Toggle store on/off and update store name)
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerProfile?.id) return;
    try {
      setSavingStoreSettings(true);
      setStoreMessage(null);
      const { error } = await supabase
        .from('designer_profiles')
        .update({
          has_store: hasStore,
          store_name: storeName.trim() || null,
        })
        .eq('id', designerProfile.id);

      if (error) throw error;
      await refreshProfile();
      setStoreMessage({
        type: 'success',
        text: hasStore
          ? 'Store settings updated! Your Studio Store is now active.'
          : 'Store settings saved. Public store is currently offline.',
      });
      setTimeout(() => setStoreMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save store settings:', err);
      setStoreMessage({
        type: 'error',
        text: err.message || 'Failed to update store settings.',
      });
    } finally {
      setSavingStoreSettings(false);
    }
  };

  // Toggle in-stock status for a product
  const handleToggleProductStock = async (product: StoreProduct) => {
    try {
      const nextStock = !product.in_stock;
      const { error } = await supabase
        .from('store_products')
        .update({ in_stock: nextStock })
        .eq('id', product.id);

      if (error) throw error;
      setStoreProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, in_stock: nextStock } : p))
      );
    } catch (err: any) {
      console.error('Failed to update product stock:', err);
      alert('Could not update stock status. Please try again.');
    }
  };

  // Delete product from store
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product from your store?')) return;
    try {
      setDeletingProductId(productId);
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      setStoreProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      alert(err.message || 'Could not delete product.');
    } finally {
      setDeletingProductId(null);
    }
  };

  // Handle product image selection
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setProductError('Photo file is too large (max 15MB).');
        return;
      }
      setProductImageFile(file);
      setProductPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Toggle size selection for product
  const toggleProductSize = (size: string) => {
    if (productSizes.includes(size)) {
      setProductSizes(productSizes.filter((s) => s !== size));
    } else {
      setProductSizes([...productSizes, size]);
    }
  };

  // Add new product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productImageFile) {
      setProductError('Please select a photo of the product.');
      return;
    }
    if (!productTitle.trim()) {
      setProductError('Please enter a product title.');
      return;
    }
    const numericPrice = parseFloat(productPrice);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setProductError('Please enter a valid price in Naira (₦).');
      return;
    }
    if (!designerProfile?.id) {
      setProductError('Designer profile not found.');
      return;
    }

    try {
      setIsAddingProduct(true);
      setProductError('');
      setProductSuccess('');

      const compressedFile = await compressImage(productImageFile, 1200, 1200, 0.85);
      const fileName = `products/${designerProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;

      const { error: storageError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('portfolio').getPublicUrl(fileName);

      const { data, error: dbError } = await supabase
        .from('store_products')
        .insert([
          {
            designer_id: designerProfile.id,
            title: productTitle.trim(),
            description: productDescription.trim() || null,
            price: numericPrice,
            image_url: publicUrl,
            category: productCategory,
            sizes: productSizes.length > 0 ? productSizes : null,
            in_stock: productInStock,
          },
        ])
        .select('*')
        .single();

      if (dbError) throw dbError;

      // Automatically enable store if it was not enabled yet
      if (!hasStore) {
        setHasStore(true);
        await supabase
          .from('designer_profiles')
          .update({ has_store: true })
          .eq('id', designerProfile.id);
        await refreshProfile();
      }

      setProductSuccess('Product added to your store successfully!');
      setProductTitle('');
      setProductPrice('');
      setProductDescription('');
      setProductImageFile(null);
      setProductPreviewUrl(null);
      if (productImageInputRef.current) productImageInputRef.current.value = '';

      if (data) {
        setStoreProducts((prev) => [data as StoreProduct, ...prev]);
      } else {
        await loadStoreProducts(designerProfile.id);
      }

      setTimeout(() => {
        setProductModalOpen(false);
        setProductSuccess('');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to add store product:', err);
      setProductError(err.message || 'Failed to add product. Please try again.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const availableAreas = STATE_AREAS[selectedState] || ['General / City Center', 'Other'];

  // Calculations for stats
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedRequests = requests.filter((r) => r.status === 'accepted');
  const completedRequests = requests.filter((r) => r.status === 'completed');

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 'New';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Designer Studio Header & Key Performance Bar */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                Designer Studio
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-500 font-medium bg-stone-100 px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {designerProfile?.area || 'Lagos'}, {designerProfile?.state || 'Nigeria'}
              </span>
              {reviews.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {avgRating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
              {designerProfile?.business_name || profile?.full_name || 'My Tailor Brand'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
              Manage client requests, showcase new outfits, and monitor feedback and rank.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {designerProfile && (
              <Link
                href={`/designer/${designerProfile.id}`}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <Eye className="w-4 h-4 text-brand-600" />
                Public Profile
              </Link>
            )}

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              Upload Work
            </button>
          </div>
        </div>

        {/* Studio Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Designs
            </span>
            <p className="text-2xl font-black text-stone-900">{items.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Pending Orders
            </span>
            <p className="text-2xl font-black text-amber-600">{pendingRequests.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Active Orders
            </span>
            <p className="text-2xl font-black text-emerald-600">{acceptedRequests.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Designer Rating
            </span>
            <p className="text-2xl font-black text-stone-900 flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              {avgRating}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`pb-3 text-sm font-bold transition-all relative flex-shrink-0 ${
            activeTab === 'portfolio'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Portfolio Gallery ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-bold transition-all relative flex-shrink-0 flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Client Requests ({requests.length})</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {pendingRequests.length} new
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-sm font-bold transition-all relative flex-shrink-0 ${
            activeTab === 'reviews'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Ratings &amp; Reviews ({reviews.length})
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`pb-3 text-sm font-bold transition-all relative flex-shrink-0 flex items-center gap-2 ${
            activeTab === 'store'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-brand-600" />
          <span>My Store &amp; RTW ({storeProducts.length})</span>
          {hasStore && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Store is Active" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold transition-all relative flex-shrink-0 ${
            activeTab === 'profile'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Brand Settings
        </button>
      </div>

      {/* TAB 1: PORTFOLIO GALLERY */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {loadingItems ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-sm font-semibold">Loading your portfolio collection...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Your portfolio is empty
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Upload photos and short clips of your recent outfits (Ankara, Senator suits, Owambe styles) so clients can see your craftsmanship.
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload First Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                    {item.media_type === 'video' ? (
                      <video
                        src={item.media_url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.caption || 'Tailor work'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    
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

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs sm:text-sm text-stone-800 font-medium line-clamp-2">
                      {item.caption || 'Custom tailored creation'}
                    </p>

                    <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-medium">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      
                      <button
                        onClick={() => handleDeleteItem(item)}
                        disabled={deletingId === item.id}
                        className="text-stone-400 hover:text-red-600 transition-colors p-1"
                        title="Delete item"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLIENT REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Status filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            {(['all', 'pending', 'accepted', 'completed', 'declined'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setRequestFilter(filter)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  requestFilter === filter
                    ? 'bg-stone-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {filter} {filter === 'all' ? `(${requests.length})` : ''}
              </button>
            ))}
          </div>

          {loadingRequests ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-sm font-semibold">Loading client requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2">
              <Inbox className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h3 className="font-bold text-base text-stone-900">
                No {requestFilter !== 'all' ? requestFilter : ''} requests found
              </h3>
              <p className="text-xs text-stone-500">
                When clients discover your portfolio and submit custom outfit requests, they will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : req.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-xs text-stone-400 font-medium">
                          Received {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 text-base">
                        Client: {req.client?.full_name || 'Fashion Client'}
                      </h3>
                    </div>

                    <div className="text-sm font-extrabold text-stone-900">
                      ₦{req.budget_min.toLocaleString()}
                      {req.budget_max ? ` - ₦${req.budget_max.toLocaleString()}` : ''}
                    </div>
                  </div>

                  {/* Description & specs */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-2 text-xs text-stone-700">
                    <p className="font-medium leading-relaxed">{req.style_description}</p>
                    <div className="flex flex-wrap gap-4 text-stone-500 pt-1 font-medium">
                      {req.fabric && (
                        <span>Fabric: <strong className="text-stone-800">{req.fabric}</strong></span>
                      )}
                      {req.deadline && (
                        <span>Needed By: <strong className="text-stone-800">{new Date(req.deadline).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                    {req.reference_image_url && (
                      <div className="pt-2">
                        <span className="font-semibold text-stone-500 block mb-1">Client Reference Image:</span>
                        <img
                          src={req.reference_image_url}
                          alt="Reference Style"
                          className="w-24 h-24 object-cover rounded-xl border border-stone-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Link
                      href={`/messages/${req.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                      Chat with Client
                    </Link>

                    <div className="flex items-center gap-2">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'accepted')}
                            disabled={updatingRequestId === req.id}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept Request
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'declined')}
                            disabled={updatingRequestId === req.id}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            Decline
                          </button>
                        </>
                      )}

                      {req.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'completed')}
                          disabled={updatingRequestId === req.id}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark as Completed
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RATINGS & REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-stone-900">
                Client Feedback &amp; Reputation
              </h3>
              <p className="text-xs text-stone-500">
                High ratings boost your placement on the marketplace search and ranking system.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 px-6 py-4 rounded-2xl">
              <div className="text-center">
                <p className="text-3xl font-black text-amber-900 flex items-center gap-1.5 justify-center">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                  {avgRating}
                </p>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mt-0.5">
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </p>
              </div>
            </div>
          </div>

          {loadingReviews ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-sm font-semibold">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2">
              <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h3 className="font-bold text-base text-stone-900">
                No reviews yet
              </h3>
              <p className="text-xs text-stone-500">
                As you complete outfit requests for clients, encourage them to leave feedback to build your reputation!
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
                          className={`w-4 h-4 ${
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
      )}

      {/* TAB 4: EDIT BRAND PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Brand Profile Details
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                This information helps clients across Nigeria discover your tailoring studio.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Business / Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Ade Bespoke & Stitches"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* State and Area mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  State in Nigeria <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Area / Neighborhood <span className="text-red-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Bio / About Your Brand
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your tailoring background, materials you work best with (Ankara, Senegalese, Cashmere, Brocade), and average turnaround time..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Specialties &amp; Outfit Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {FASHION_CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Updates...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB: MY STORE & RTW */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {/* Store Settings & Status Card */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-600" />
                  <h2 className="text-xl font-black text-stone-900 tracking-tight">
                    Studio Store &amp; Ready-to-Wear (RTW)
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      hasStore
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    {hasStore ? '● Active & Live' : '○ Offline'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-500">
                  Sell ready-made Senator suits, Agbada sets, Ankara gowns, fabrics, and accessories directly to clients across Nigeria.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {designerProfile && (
                  <Link
                    href={`/designer/${designerProfile.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview in Profile
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>

            {/* Store Config Form */}
            <form onSubmit={handleSaveStoreSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Store Display Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={designerProfile?.business_name ? `${designerProfile.business_name} RTW Store` : 'e.g. My Brand RTW Studio'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Store Visibility
                </label>
                <div className="flex items-center gap-3 py-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasStore}
                      onChange={(e) => setHasStore(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="text-xs font-semibold text-stone-700">
                    {hasStore ? 'Public Store is Enabled' : 'Public Store is Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingStoreSettings}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-50"
                >
                  {savingStoreSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Store Settings
                    </>
                  )}
                </button>
                {storeMessage && (
                  <span
                    className={`text-xs font-bold ${
                      storeMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {storeMessage.text}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Products List */}
          {loadingStore ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-sm font-semibold">Loading your store products...</p>
            </div>
          ) : storeProducts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  No products in your store yet
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Add ready-to-wear items, fabrics, or accessories with prices in Naira. Clients can browse and order directly from your store on Tailoram.
                </p>
              </div>
              <button
                onClick={() => setProductModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {storeProducts.map((product) => {
                const categoryObj = STORE_CATEGORIES.find((c) => c.id === product.category);
                const categoryLabel = categoryObj?.label || product.category;

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-square bg-stone-100 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/95 text-stone-800 shadow-sm backdrop-blur-xs">
                          {categoryLabel}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleProductStock(product)}
                          title="Click to toggle stock status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm transition-all ${
                            product.in_stock
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-stone-800 text-stone-200 hover:bg-stone-900'
                          }`}
                        >
                          {product.in_stock ? 'In Stock' : 'Sold Out'}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-bold text-stone-900 text-sm line-clamp-1">
                            {product.title}
                          </h4>
                        </div>
                        <p className="text-base font-black text-brand-700">
                          ₦{product.price.toLocaleString()}
                        </p>
                        {product.description && (
                          <p className="text-xs text-stone-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        {product.sizes && product.sizes.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-stone-400 uppercase">
                              Sizes:
                            </span>
                            {product.sizes.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleProductStock(product)}
                          className="text-xs font-semibold text-stone-600 hover:text-brand-600 transition-colors"
                        >
                          {product.in_stock ? 'Mark Sold Out' : 'Mark In Stock'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deletingProductId === product.id}
                          className="text-stone-400 hover:text-red-600 transition-colors p-1"
                          title="Delete product"
                        >
                          {deletingProductId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Upload Portfolio Work
              </h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFile(null);
                  setPreviewUrl(null);
                  setUploadError('');
                }}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Media Type Switcher */}
              <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('image');
                    setUploadError('');
                  }}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    uploadMediaType === 'image'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                  Outfit Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('video');
                    setUploadError('');
                  }}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    uploadMediaType === 'video'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-brand-600" />
                  Video Reel Clip
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {uploadMediaType === 'video' ? 'Select Video Reel (.mp4, .mov)' : 'Select Photo (.jpg, .png, .webp)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={
                    uploadMediaType === 'video'
                      ? 'video/mp4,video/quicktime,video/webm'
                      : 'image/jpeg,image/png,image/webp'
                  }
                  onChange={handleFileChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  {uploadMediaType === 'video'
                    ? 'Upload short clips (up to 40MB) showing outfit movement, 360° views, and embroidery shine.'
                    : 'Photos are automatically compressed to WebP for fast Nigerian mobile loading.'}
                </p>
              </div>

              {previewUrl && (
                <div className="aspect-[4/3] bg-stone-900 rounded-2xl overflow-hidden relative border border-stone-200">
                  {uploadFile?.type.startsWith('video/') || uploadMediaType === 'video' ? (
                    <video src={previewUrl} controls playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Style Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="agbada">Agbada &amp; Senegalese</option>
                  <option value="aso_ebi">Aso Ebi &amp; Owambe</option>
                  <option value="senator">Senator &amp; Kaftan</option>
                  <option value="ankara">Ankara Prints</option>
                  <option value="adire">Adire &amp; Heritage</option>
                  <option value="bridal">Bridal &amp; Traditional</option>
                  <option value="ready_to_wear">Ready-to-Wear (RTW)</option>
                  <option value="contemporary">Contemporary / Casual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Caption / Style Description
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. 3-piece Royal Agbada with custom embroidery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compressing &amp; Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STORE PRODUCT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-600" />
                Add Product to Studio Store
              </h3>
              <button
                onClick={() => {
                  setProductModalOpen(false);
                  setProductImageFile(null);
                  setProductPreviewUrl(null);
                  setProductError('');
                }}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {productError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{productError}</span>
              </div>
            )}

            {productSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{productSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Photo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={productImageInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProductImageChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Showcase your ready-to-wear piece, fabric bundle, or native accessory. Compressed automatically.
                </p>
              </div>

              {productPreviewUrl && (
                <div className="aspect-[4/3] bg-stone-900 rounded-2xl overflow-hidden relative border border-stone-200">
                  <img src={productPreviewUrl} alt="Product Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Product Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                    placeholder="e.g. Midnight Blue 3-Piece Senator Suit"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Price in Naira (₦) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                      ₦
                    </span>
                    <input
                      type="number"
                      required
                      min="500"
                      step="500"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="45000"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {STORE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Available Sizes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size', 'Custom Tailored'].map((size) => {
                    const isSelected = productSizes.includes(size);
                    return (
                      <button
                        type="button"
                        key={size}
                        onClick={() => toggleProductSize(size)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Details / Fabric Material
                </label>
                <textarea
                  rows={2}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="e.g. Pure Irish wool blend, comes with trousers and custom embroidery details. Ready for immediate pickup or delivery."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="productInStock"
                  checked={productInStock}
                  onChange={(e) => setProductInStock(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-stone-300"
                />
                <label htmlFor="productInStock" className="text-xs font-medium text-stone-700 cursor-pointer">
                  In Stock &amp; Ready for Delivery
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct || !productImageFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {isAddingProduct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publishing Product...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to Store
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
