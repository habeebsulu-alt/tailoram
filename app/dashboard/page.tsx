'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { compressImage, compressAvatarImage } from '@/lib/imageCompressor';
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
  DesignerProfile,
  ClientMeasurements,
} from '@/lib/types';
import { formatNigerianPhoneForInput } from '@/lib/phoneUtils';
import { fetchManualRatings, computeEffectiveRating, mergeWithLocalReviews, resolveReviewClientName, ManualRatingData } from '@/lib/ratingsManager';
import {
  markOrderReadyForBalance,
  getLocalRequestOverrides,
  fetchCloudRequestOverrides,
  getLocalCreatedRequests,
  calculatePaymentBreakdown,
  saveLocalCreatedRequest,
  respondToQuote,
  PaymentResult,
} from '@/lib/payments';
import { triggerEmailNotification, resolveUserEmail } from '@/lib/emailNotifications';
import QuoteModal from '@/components/QuoteModal';
import OrderReviewModal from '@/components/OrderReviewModal';
import MeasurementsModal from '@/components/MeasurementsModal';
import PaymentModal from '@/components/PaymentModal';

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
  ShieldCheck,
  Camera,
  X,
  Maximize2,
  Layers,
  Edit3,
  Pencil,
  RefreshCw,
  FileText,
  Ruler,
  Send,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';

export default function DesignerDashboard() {
  const router = useRouter();
  const { user, profile, designerProfile, refreshProfile, loading: authLoading, isImpersonating } = useAuth();

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
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'production' | 'quoted' | 'completed' | 'declined'>('all');
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  // Workflow modals
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [targetQuoteRequest, setTargetQuoteRequest] = useState<OutfitRequest | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetReviewRequest, setTargetReviewRequest] = useState<OutfitRequest | null>(null);
  const [reviewedClientIds, setReviewedClientIds] = useState<string[]>([]);
  const [measurementsModalOpen, setMeasurementsModalOpen] = useState(false);
  const [selectedMeasurementsRequest, setSelectedMeasurementsRequest] = useState<OutfitRequest | null>(null);

  // Raised orders state (orders this designer commissioned as a client)
  const [myRaisedRequests, setMyRaisedRequests] = useState<OutfitRequest[]>([]);
  const [loadingRaisedRequests, setLoadingRaisedRequests] = useState(true);
  const [requestViewMode, setRequestViewMode] = useState<'received' | 'raised'>('received');
  const [allDesignersList, setAllDesignersList] = useState<DesignerProfile[]>([]);

  // Raised orders payment & action states
  const [raisedPaymentModalOpen, setRaisedPaymentModalOpen] = useState(false);
  const [raisedPaymentType, setRaisedPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [selectedRaisedPaymentRequest, setSelectedRaisedPaymentRequest] = useState<OutfitRequest | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Raise new order modal state
  const [raiseOrderModalOpen, setRaiseOrderModalOpen] = useState(false);
  const [raiseTargetDesignerId, setRaiseTargetDesignerId] = useState('');
  const [raiseStyleDescription, setRaiseStyleDescription] = useState('');
  const [raiseFabric, setRaiseFabric] = useState('');
  const [raiseBudgetMin, setRaiseBudgetMin] = useState('');
  const [raiseBudgetMax, setRaiseBudgetMax] = useState('');
  const [raiseDeadline, setRaiseDeadline] = useState('');
  const [raiseReferenceFile, setRaiseReferenceFile] = useState<File | null>(null);
  const [raisePreviewUrl, setRaisePreviewUrl] = useState<string | null>(null);
  const [raiseShowMeasurements, setRaiseShowMeasurements] = useState(false);
  const [raiseMeasurements, setRaiseMeasurements] = useState<ClientMeasurements>({
    chest: '',
    shoulder: '',
    sleeve: '',
    neck: '',
    waist: '',
    hips: '',
    top_length: '',
    trouser_length: '',
    thigh: '',
    agbada_length: '',
    fit_preference: 'regular',
    notes: '',
  });
  const [isSubmittingRaiseOrder, setIsSubmittingRaiseOrder] = useState(false);
  const [raiseOrderError, setRaiseOrderError] = useState('');
  const [raiseOrderSuccess, setRaiseOrderSuccess] = useState('');
  const raiseFileInputRef = useRef<HTMLInputElement>(null);


  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [manualRatings, setManualRatings] = useState<Record<string, ManualRatingData>>({});

  // Upload modal & form state (supports multiple photos or single video)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'image' | 'video'>('image');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previewItems, setPreviewItems] = useState<{ id: string; file: File; url: string; isVideo: boolean; caption?: string }[]>([]);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadCategory, setUploadCategory] = useState('agbada');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit / Update Portfolio Item modal & form state
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCategory, setEditCategory] = useState('agbada');
  const [editReplacementFile, setEditReplacementFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Cover image / Starting homepage badge state
  const [coverItemId, setCoverItemId] = useState<string | null>(null);
  const [coverSuccessMessage, setCoverSuccessMessage] = useState<string | null>(null);
  const [editIsCover, setEditIsCover] = useState(false);

  // Avatar / Profile picture upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarFitMode, setAvatarFitMode] = useState<'contain' | 'cover'>('cover');
  const [zoomAvatarUrl, setZoomAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const toggleAvatarFit = () => {
    const nextMode = avatarFitMode === 'contain' ? 'cover' : 'contain';
    setAvatarFitMode(nextMode);
    if (designerProfile?.id && typeof window !== 'undefined') {
      localStorage.setItem(`tailoram_avatar_fit_${designerProfile.id}`, nextMode);
    }
  };

  // Edit profile state
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [area, setArea] = useState('Ikeja');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [genderFocus, setGenderFocus] = useState<'male' | 'female' | 'unisex'>('unisex');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Delete item state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Populate profile fields when designerProfile loads
  useEffect(() => {
    if (designerProfile) {
      const storedUpdatedProfiles = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('tailoram_updated_designer_profiles') || '{}')
        : {};
      const localUpdates = storedUpdatedProfiles[designerProfile.id] || {};

      setBusinessName(localUpdates.business_name || designerProfile.business_name || '');
      setBio(localUpdates.bio !== undefined ? localUpdates.bio : (designerProfile.bio || ''));
      setSelectedState(localUpdates.state || designerProfile.state || 'Lagos');
      setArea(localUpdates.area || designerProfile.area || 'Ikeja');
      setAddress(localUpdates.address !== undefined ? localUpdates.address : (designerProfile.address || ''));
      setWhatsapp(localUpdates.whatsapp !== undefined ? localUpdates.whatsapp : (designerProfile.whatsapp || ''));
      setCategories(localUpdates.categories || designerProfile.categories || ['native_wear']);

      const localHasStore = typeof window !== 'undefined'
        ? localStorage.getItem(`tailoram_has_store_${designerProfile.id}`)
        : null;
      const localStoreName = typeof window !== 'undefined'
        ? localStorage.getItem(`tailoram_store_name_${designerProfile.id}`)
        : null;
      setHasStore(localHasStore !== null ? localHasStore === 'true' : Boolean(designerProfile.has_store));
      setStoreName(designerProfile.store_name || localStoreName || '');

      const localGender = typeof window !== 'undefined'
        ? (localUpdates.gender_focus || localStorage.getItem(`tailoram_gender_${designerProfile.id}`) || localStorage.getItem(`tailoram_gender_focus_${designerProfile.id}`))
        : null;
      setGenderFocus((designerProfile.gender_focus as any) || (localGender as any) || 'unisex');

      const localCover = typeof window !== 'undefined'
        ? localStorage.getItem(`tailoram_cover_${designerProfile.id}`)
        : null;
      setCoverItemId((designerProfile as any).cover_image_id || localCover || null);

      const localFit = typeof window !== 'undefined'
        ? localStorage.getItem(`tailoram_avatar_fit_${designerProfile.id}`)
        : null;
      if (localFit === 'contain' || localFit === 'cover') {
        setAvatarFitMode(localFit);
      } else {
        setAvatarFitMode('cover');
      }
    }
  }, [designerProfile]);

  // Load portfolio items with deletion and update persistence
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
        const deletedIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('tailoram_deleted_portfolio_items') || '[]')
          : [];
        const updatedMap: Record<string, Partial<PortfolioItem>> = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('tailoram_updated_portfolio_items') || '{}')
          : {};
        const activeItems = ((data as PortfolioItem[]) || [])
          .filter((i) => !deletedIds.includes(i.id))
          .map((i) => (updatedMap[i.id] ? { ...i, ...updatedMap[i.id] } : i));
        setItems(activeItems);
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

      if (error) {
        console.warn('Could not load requests from Supabase:', error.message);
      }

      const cloudOverrides = await fetchCloudRequestOverrides();
      const overrides = { ...cloudOverrides, ...getLocalRequestOverrides() };
      const rawList = (data as OutfitRequest[]) || [];
      const localCreated = getLocalCreatedRequests().filter((r) => r.designer_id === designerId);
      const existingIds = new Set(rawList.map((r) => r.id));
      const combined = [...rawList, ...localCreated.filter((r) => !existingIds.has(r.id))];

      const merged = combined.map((r) => ({
        ...r,
        ...(overrides[r.id] || {}),
      }));
      setRequests(merged);

      // Check if designer has reviewed each completed request
      const reviewedIds: string[] = [];
      if (typeof window !== 'undefined' && user) {
        merged.forEach((r) => {
          if (localStorage.getItem(`tailoram_request_review_${r.id}_${user.id}`)) {
            reviewedIds.push(r.id);
          }
        });
      }
      setReviewedClientIds(reviewedIds);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load orders raised by this designer (as a client/buyer)
  const loadRaisedRequests = async (userId: string) => {
    try {
      setLoadingRaisedRequests(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*, designer:designer_id(id, business_name, state, area, profile_image_url, user_id)')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load raised requests from Supabase:', error.message);
      }

      const cloudOverrides = await fetchCloudRequestOverrides();
      const overrides = { ...cloudOverrides, ...getLocalRequestOverrides() };
      const rawList = (data as OutfitRequest[]) || [];
      const localCreated = getLocalCreatedRequests().filter((r) => r.client_id === userId);
      const existingIds = new Set(rawList.map((r) => r.id));
      const combined = [...rawList, ...localCreated.filter((r) => !existingIds.has(r.id))];

      const merged = combined.map((r) => ({
        ...r,
        ...(overrides[r.id] || {}),
      }));
      setMyRaisedRequests(merged);
    } catch (err) {
      console.error('Failed to load raised requests:', err);
    } finally {
      setLoadingRaisedRequests(false);
    }
  };

  // Load all platform designers for the "Raise Order" selector
  const loadAllDesigners = async () => {
    try {
      const { data } = await supabase
        .from('designer_profiles')
        .select('id, business_name, state, area, profile_image_url, categories, user_id')
        .order('business_name', { ascending: true });

      if (data) {
        setAllDesignersList(data as DesignerProfile[]);
      }
    } catch {}
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

      const rawRevs = (data as Review[]) || [];
      const mergedRevs = mergeWithLocalReviews(rawRevs, designerId);
      setReviews(mergedRevs);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      const mergedRevs = mergeWithLocalReviews([], designerId);
      setReviews(mergedRevs);
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
    } else {
      if (designerProfile?.id) {
        loadPortfolio(designerProfile.id);
        loadRequests(designerProfile.id);
        loadReviews(designerProfile.id);
        loadStoreProducts(designerProfile.id);
        fetchManualRatings().then(setManualRatings);
      }
      if (user?.id) {
        loadRaisedRequests(user.id);
        loadAllDesigners();
      }
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

  // Handle Studio Profile Picture / Avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image (.jpg, .png, .webp).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setAvatarError('Profile photo must be under 15MB.');
      return;
    }
    if (!designerProfile?.id) {
      setAvatarError('Designer profile not found.');
      return;
    }

    try {
      setAvatarUploading(true);
      setAvatarError('');
      setAvatarSuccess('');

      // Format & compress with exact aspect-ratio preservation for WhatsApp-style circular display
      const compressedFile = await compressAvatarImage(file, 800, 0.92);
      const fileName = `avatars/${designerProfile.id}-${Date.now()}.webp`;

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

      // Save to localStorage for instant persistence across demo/impersonation sessions
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tailoram_avatar_${designerProfile.id}`, publicUrl);
        const storedUpdatedProfiles = JSON.parse(
          localStorage.getItem('tailoram_updated_designer_profiles') || '{}'
        );
        storedUpdatedProfiles[designerProfile.id] = {
          ...(storedUpdatedProfiles[designerProfile.id] || {}),
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(
          'tailoram_updated_designer_profiles',
          JSON.stringify(storedUpdatedProfiles)
        );

        // Automatically default new uploads to fill the circle edge-to-edge
        localStorage.setItem(`tailoram_avatar_fit_${designerProfile.id}`, 'cover');
        setAvatarFitMode('cover');
      }

      // Update in designer_profiles table
      try {
        await supabase
          .from('designer_profiles')
          .update({ profile_image_url: publicUrl })
          .eq('id', designerProfile.id);
      } catch (dbErr) {
        console.warn('Could not update designer_profiles profile_image_url:', dbErr);
      }

      // Update in profiles table if available
      if (profile?.id) {
        try {
          await supabase
            .from('profiles')
            .update({ profile_image_url: publicUrl } as any)
            .eq('id', profile.id);
        } catch {}
      }

      await refreshProfile();
      setAvatarSuccess('Studio profile picture updated successfully!');
      setTimeout(() => setAvatarSuccess(''), 3000);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setAvatarError(err.message || 'Failed to upload profile picture.');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Handle File selection (Supports multiple outfit photos or single video reel)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    if (uploadMediaType === 'video') {
      const file = files[0];
      if (file.size > 40 * 1024 * 1024) {
        setUploadError('Video file exceeds 40MB limit. Please choose a shorter clip for fast Nigerian mobile playback.');
        return;
      }
      setUploadFiles([file]);
      setPreviewItems([{
        id: Math.random().toString(36).substring(2, 9),
        file,
        url: URL.createObjectURL(file),
        isVideo: true,
      }]);
    } else {
      // Multiple photos!
      const validFiles: File[] = [];
      const newPreviews: { id: string; file: File; url: string; isVideo: boolean }[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setUploadError('Please select valid image files (.jpg, .png, .webp).');
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 15MB limit.`);
          continue;
        }
        validFiles.push(file);
        newPreviews.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          url: URL.createObjectURL(file),
          isVideo: false,
        });
      }

      if (validFiles.length > 0) {
        setUploadFiles((prev) => [...prev, ...validFiles]);
        setPreviewItems((prev) => [...prev, ...newPreviews]);
      }
    }
  };

  // Remove individual photo from selected list
  const removePreviewItem = (id: string) => {
    const item = previewItems.find((p) => p.id === id);
    if (item) {
      URL.revokeObjectURL(item.url);
      setPreviewItems((prev) => prev.filter((p) => p.id !== id));
      setUploadFiles((prev) => prev.filter((f) => f !== item.file));
    }
  };

  // Update caption for an individual photo in multi-upload
  const updatePreviewCaption = (id: string, newCaption: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: newCaption } : item))
    );
  };

  // Upload Portfolio Items (handles single or batch multi-photo upload)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError(
        uploadMediaType === 'video'
          ? 'Please select a video clip to upload.'
          : 'Please select one or more outfit photos to upload.'
      );
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

      const total = uploadFiles.length;
      const newItemsToInsert: any[] = [];

      for (let i = 0; i < total; i++) {
        const file = uploadFiles[i];
        const previewItem = previewItems.find((p) => p.file === file) || previewItems[i];
        const itemCaption = (previewItem?.caption !== undefined && previewItem.caption !== '')
          ? previewItem.caption.trim()
          : (caption.trim() || null);

        const isVideo = file.type.startsWith('video/') || uploadMediaType === 'video';
        const mediaType = isVideo ? 'video' : 'image';

        setUploadProgressText(
          total > 1
            ? `Uploading photo ${i + 1} of ${total}: ${file.name.slice(0, 18)}...`
            : isVideo
            ? 'Uploading video reel...'
            : 'Compressing and uploading outfit photo...'
        );

        let finalFile: File = file;
        if (!isVideo) {
          finalFile = await compressImage(file, 1400, 1400, 0.82);
        }

        const fileExt = finalFile.name.split('.').pop() || (isVideo ? 'mp4' : 'webp');
        const fileName = `${designerProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: storageError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, finalFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: isVideo ? file.type || 'video/mp4' : 'image/webp',
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

        newItemsToInsert.push({
          designer_id: designerProfile.id,
          media_url: publicUrl,
          media_type: mediaType,
          caption: itemCaption || null,
          category: uploadCategory,
        });
      }

      setUploadProgressText('Saving outfits to studio portfolio...');
      const { error: dbError } = await supabase.from('portfolio_items').insert(newItemsToInsert);

      if (dbError) throw dbError;

      setUploadSuccess(
        total > 1
          ? `Successfully uploaded ${total} outfit photos to your portfolio!`
          : 'Portfolio item added successfully!'
      );
      setUploadFiles([]);
      previewItems.forEach((p) => URL.revokeObjectURL(p.url));
      setPreviewItems([]);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadPortfolio(designerProfile.id);

      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccess('');
        setUploadProgressText('');
      }, 1200);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Delete Portfolio Item (Guaranteed to work for normal tailors AND Admin impersonations)
  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      setDeletingId(item.id);

      // 1. Immediately record in persistent deleted items
      if (typeof window !== 'undefined') {
        const deletedIds: string[] = JSON.parse(
          localStorage.getItem('tailoram_deleted_portfolio_items') || '[]'
        );
        if (!deletedIds.includes(item.id)) {
          deletedIds.push(item.id);
          localStorage.setItem(
            'tailoram_deleted_portfolio_items',
            JSON.stringify(deletedIds)
          );
        }

        // Also clean up updated items cache if present
        const storedUpdates: Record<string, any> = JSON.parse(
          localStorage.getItem('tailoram_updated_portfolio_items') || '{}'
        );
        if (storedUpdates[item.id]) {
          delete storedUpdates[item.id];
          localStorage.setItem('tailoram_updated_portfolio_items', JSON.stringify(storedUpdates));
        }
      }

      // 2. Remove from React state immediately
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      // 3. Call security definer RPC (bypasses RLS for admin impersonations)
      try {
        await supabase.rpc('delete_portfolio_item', { target_item_id: item.id });
      } catch (rpcErr) {
        // Fallback to direct supabase delete
        await supabase.from('portfolio_items').delete().eq('id', item.id);
      }

      // 4. Try removing file from Supabase storage
      try {
        const parts = item.media_url.split('/portfolio/');
        if (parts.length > 1) {
          const storagePath = parts[1];
          await supabase.storage.from('portfolio').remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn('Could not remove file from storage:', storageErr);
      }
    } catch (err: any) {
      console.error('Could not delete item:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Open Edit Portfolio Item Modal
  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setEditCaption(item.caption || '');
    setEditCategory((item as any).category || 'agbada');
    setEditReplacementFile(null);
    setEditPreviewUrl(null);
    setEditIsCover(item.id === coverItemId);
    setUpdateError('');
    setUpdateSuccess('');
  };

  // Set portfolio item as the homepage starting badge / cover image
  const handleSetCoverItem = async (item: PortfolioItem) => {
    if (!designerProfile?.id) return;
    try {
      setCoverItemId(item.id);

      // 1. Immediately store in localStorage for zero-latency reflection
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tailoram_cover_${designerProfile.id}`, item.id);
        localStorage.setItem(`tailoram_cover_url_${designerProfile.id}`, item.media_url);
      }

      // 2. Persist in Supabase designer_profiles via RPC & direct update
      try {
        await supabase.rpc('set_designer_cover_image', {
          target_designer_id: designerProfile.id,
          new_cover_image_id: item.id,
          new_cover_image_url: item.media_url,
        });
      } catch (rpcErr) {
        // Fallback to direct supabase update
        await supabase
          .from('designer_profiles')
          .update({
            cover_image_id: item.id,
            cover_image_url: item.media_url,
          })
          .eq('id', designerProfile.id);
      }

      setCoverSuccessMessage('⭐ Homepage Cover Updated! This image will now start your studio card on the homepage.');
      setTimeout(() => setCoverSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to set cover image:', err);
    }
  };

  // Close Edit Portfolio Item Modal
  const closeEditModal = () => {
    if (editPreviewUrl && editPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(editPreviewUrl);
    }
    setEditingItem(null);
    setEditReplacementFile(null);
    setEditPreviewUrl(null);
    setUpdateError('');
    setUpdateSuccess('');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  // Select replacement photo or video
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 40 * 1024 * 1024) {
      setUpdateError('Video file exceeds 40MB limit.');
      return;
    }
    if (!isVideo && file.size > 15 * 1024 * 1024) {
      setUpdateError('Image file exceeds 15MB limit.');
      return;
    }

    setEditReplacementFile(file);
    if (editPreviewUrl && editPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(editPreviewUrl);
    }
    setEditPreviewUrl(URL.createObjectURL(file));
  };

  // Save / Update Portfolio Item
  const handleUpdateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsUpdatingItem(true);
      setUpdateError('');
      setUpdateSuccess('');

      let finalMediaUrl = editingItem.media_url;
      let finalMediaType = editingItem.media_type;

      // 1. If replacement photo or video was selected, compress & upload
      if (editReplacementFile) {
        const isVideo = editReplacementFile.type.startsWith('video/');
        finalMediaType = isVideo ? 'video' : 'image';

        let uploadFile: File = editReplacementFile;
        if (!isVideo) {
          uploadFile = await compressImage(editReplacementFile, 1400, 1400, 0.82);
        }

        const fileExt = uploadFile.name.split('.').pop() || (isVideo ? 'mp4' : 'webp');
        const fileName = `${designerProfile?.id || 'portfolio'}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: storageError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, uploadFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: isVideo ? editReplacementFile.type || 'video/mp4' : 'image/webp',
          });

        if (storageError) {
          console.error('Storage upload error:', storageError);
          if (storageError.message?.includes('Bucket not found')) {
            throw new Error('The "portfolio" storage bucket is not configured yet in Supabase.');
          }
          throw storageError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('portfolio').getPublicUrl(fileName);
        finalMediaUrl = publicUrl;
      }

      const updatedPayload = {
        caption: editCaption.trim() || null,
        category: editCategory,
        media_url: finalMediaUrl,
        media_type: finalMediaType,
      };

      // 2. Persist in localStorage (guarantees instant update during synthetic admin sessions)
      if (typeof window !== 'undefined') {
        const storedUpdates: Record<string, any> = JSON.parse(
          localStorage.getItem('tailoram_updated_portfolio_items') || '{}'
        );
        storedUpdates[editingItem.id] = {
          ...updatedPayload,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(
          'tailoram_updated_portfolio_items',
          JSON.stringify(storedUpdates)
        );
      }

      // 3. Update React state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                ...updatedPayload,
              }
            : i
        )
      );

      // 4. Update in Supabase via Security Definer RPC (bypasses RLS)
      try {
        await supabase.rpc('update_portfolio_item', {
          target_item_id: editingItem.id,
          new_caption: updatedPayload.caption,
          new_category: updatedPayload.category,
          new_media_url: updatedPayload.media_url,
          new_media_type: updatedPayload.media_type,
        });
      } catch (rpcErr) {
        console.warn('RPC update_portfolio_item fallback:', rpcErr);
        // Fallback to direct supabase update
        await supabase
          .from('portfolio_items')
          .update(updatedPayload)
          .eq('id', editingItem.id);
      }

      if (editIsCover) {
        handleSetCoverItem({ ...editingItem, ...updatedPayload });
      }

      setUpdateSuccess('Portfolio work updated successfully!');
      setTimeout(() => {
        closeEditModal();
      }, 1000);
    } catch (err: any) {
      console.error('Update portfolio item failed:', err);
      setUpdateError(err.message || 'Failed to update portfolio item.');
    } finally {
      setIsUpdatingItem(false);
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

  // Designer marks order ready for balance payment
  const handleMarkReadyForBalanceFromDashboard = async (requestId: string) => {
    if (!user) return;
    try {
      setUpdatingRequestId(requestId);
      await markOrderReadyForBalance({
        requestId,
        designerUserId: user.id,
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'ready_for_balance' } : r))
      );
    } catch (err: any) {
      console.error('Failed to mark ready for balance:', err);
      alert('Could not update status: ' + err.message);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  // --- ACTIONS FOR RAISED ORDERS (Designer as Buyer) ---
  const handleOpenRaisedPayment = (req: OutfitRequest, type: 'deposit' | 'balance') => {
    setSelectedRaisedPaymentRequest(req);
    setRaisedPaymentType(type);
    setRaisedPaymentModalOpen(true);
  };

  const handleAcceptQuoteAndPayRaised = async (req: OutfitRequest) => {
    if (!user) return;
    try {
      setActionLoadingId(req.id);
      await respondToQuote({
        requestId: req.id,
        clientUserId: user.id,
        accept: true,
      });

      setMyRaisedRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'accepted' } : r))
      );

      handleOpenRaisedPayment({ ...req, status: 'accepted' }, 'deposit');
    } catch (err) {
      console.error('Error accepting quote:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineQuoteRaised = async (req: OutfitRequest) => {
    if (!user) return;
    if (!confirm('Are you sure you want to decline this quote?')) return;
    try {
      setActionLoadingId(req.id);
      await respondToQuote({
        requestId: req.id,
        clientUserId: user.id,
        accept: false,
      });

      setMyRaisedRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'declined' } : r))
      );
    } catch (err) {
      console.error('Error declining quote:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitRaiseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setRaiseOrderError('');
    setRaiseOrderSuccess('');

    if (!user) {
      setRaiseOrderError('You must be logged in to raise an order.');
      return;
    }

    if (!raiseTargetDesignerId) {
      setRaiseOrderError('Please select a designer atelier to commission.');
      return;
    }

    if (!raiseStyleDescription.trim()) {
      setRaiseOrderError('Please describe the outfit you want tailored.');
      return;
    }

    const minBudget = parseFloat(raiseBudgetMin);
    if (isNaN(minBudget) || minBudget <= 0) {
      setRaiseOrderError('Please enter a valid minimum budget in Naira.');
      return;
    }

    const maxBudget = raiseBudgetMax ? parseFloat(raiseBudgetMax) : null;
    if (maxBudget !== null && maxBudget < minBudget) {
      setRaiseOrderError('Maximum budget cannot be less than minimum budget.');
      return;
    }

    try {
      setIsSubmittingRaiseOrder(true);

      let refImageUrl: string | null = null;
      if (raiseReferenceFile) {
        try {
          const compressed = await compressImage(raiseReferenceFile, 1200, 1200, 0.8);
          const fileExt = compressed.name.split('.').pop() || 'webp';
          const fileName = `${user.id}/${Date.now()}-ref.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('requests')
            .upload(fileName, compressed, { cacheControl: '3600', upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('requests').getPublicUrl(fileName);
            refImageUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr);
        }
      }

      const cleanedMeasurements: ClientMeasurements = {};
      if (raiseShowMeasurements) {
        Object.entries(raiseMeasurements).forEach(([k, v]) => {
          if (v && String(v).trim()) {
            (cleanedMeasurements as any)[k] = String(v).trim();
          }
        });
      }
      const hasMeasurements = Object.keys(cleanedMeasurements).length > 0;
      const finalMeasurements = hasMeasurements ? cleanedMeasurements : null;

      let createdRequestId: string | null = null;

      try {
        const payload: any = {
          client_id: user.id,
          designer_id: raiseTargetDesignerId,
          style_description: raiseStyleDescription.trim(),
          fabric: raiseFabric.trim() || null,
          budget_min: minBudget,
          budget_max: maxBudget,
          deadline: raiseDeadline || null,
          reference_image_url: refImageUrl,
          status: 'pending',
        };
        if (finalMeasurements) {
          payload.measurements = finalMeasurements;
        }

        const { data: rData, error: rErr } = await supabase
          .from('requests')
          .insert([payload])
          .select('id')
          .single();

        if (!rErr && rData?.id) {
          createdRequestId = rData.id;
        }
      } catch (insertErr) {
        console.warn('Insert exception:', insertErr);
      }

      const finalRequestId = createdRequestId || `req-${Date.now()}`;
      const targetDesigner = allDesignersList.find((d) => d.id === raiseTargetDesignerId);

      const newOrderObj: OutfitRequest = {
        id: finalRequestId,
        client_id: user.id,
        designer_id: raiseTargetDesignerId,
        style_description: raiseStyleDescription.trim(),
        fabric: raiseFabric.trim() || null,
        budget_min: minBudget,
        budget_max: maxBudget ?? null,
        deadline: raiseDeadline || null,
        reference_image_url: refImageUrl,
        measurements: finalMeasurements,
        status: 'pending',
        created_at: new Date().toISOString(),
        designer: targetDesigner || undefined,
        client: profile || undefined,
      };

      saveLocalCreatedRequest(newOrderObj);

      try {
        const chatContent = `👋 New bespoke request raised by ${profile?.full_name || designerProfile?.business_name || 'Designer'}:\n"${raiseStyleDescription.trim()}"\nBudget: ₦${minBudget.toLocaleString()}${maxBudget ? ` - ₦${maxBudget.toLocaleString()}` : ''}${raiseDeadline ? `\nTarget Delivery: ${new Date(raiseDeadline).toLocaleDateString()}` : ''}`;
        await supabase.from('messages').insert([
          {
            request_id: finalRequestId,
            sender_id: user.id,
            content: chatContent,
          },
        ]);
      } catch {}

      try {
        const targetEmail = resolveUserEmail(
          targetDesigner?.user_id,
          (targetDesigner as any)?.email || 'designer@tailoram.com'
        );
        triggerEmailNotification({
          event: 'new_request',
          recipientEmail: targetEmail,
          recipientName: targetDesigner?.business_name || 'Master Designer',
          subject: `🧵 New Bespoke Commission from ${designerProfile?.business_name || profile?.full_name || 'Designer'}`,
          previewText: `${designerProfile?.business_name || profile?.full_name || 'A designer'} has commissioned an outfit from your atelier: "${raiseStyleDescription.trim()}". Budget: ₦${minBudget.toLocaleString()}.`,
          ctaLink: `https://tailoram.vercel.app/messages/${finalRequestId}`,
          metadata: { requestId: finalRequestId },
        });
      } catch {}

      setMyRaisedRequests((prev) => [newOrderObj, ...prev]);
      setRequestViewMode('raised');
      setRaiseOrderSuccess('Bespoke commission raised successfully! The atelier has been notified.');

      setRaiseStyleDescription('');
      setRaiseFabric('');
      setRaiseBudgetMin('');
      setRaiseBudgetMax('');
      setRaiseDeadline('');
      setRaiseReferenceFile(null);
      setRaisePreviewUrl(null);
      if (raiseFileInputRef.current) raiseFileInputRef.current.value = '';

      setTimeout(() => {
        setRaiseOrderModalOpen(false);
        setRaiseOrderSuccess('');
      }, 1500);

    } catch (err: any) {
      console.error('Error raising order:', err);
      setRaiseOrderError(err.message || 'Could not raise order. Please try again.');
    } finally {
      setIsSubmittingRaiseOrder(false);
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

      // Always save gender focus locally for zero-latency instant reflection
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tailoram_gender_${designerProfile.id}`, genderFocus);
        localStorage.setItem(`tailoram_gender_focus_${designerProfile.id}`, genderFocus);
      }

      const updatePayload: any = {
        business_name: businessName.trim(),
        bio: bio.trim() || null,
        state: selectedState,
        city: selectedState,
        area: area,
        address: address.trim() || null,
        whatsapp: whatsapp.trim() || null,
        categories: categories,
        gender_focus: genderFocus,
      };

      // 1. Immediately persist to localStorage so updates survive refreshes even in synthetic/admin sessions
      if (typeof window !== 'undefined') {
        const storedUpdatedProfiles = JSON.parse(
          localStorage.getItem('tailoram_updated_designer_profiles') || '{}'
        );
        storedUpdatedProfiles[designerProfile.id] = {
          ...updatePayload,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(
          'tailoram_updated_designer_profiles',
          JSON.stringify(storedUpdatedProfiles)
        );
      }

      // 2. Call Security Definer RPC (bypasses RLS blocks for admin impersonations)
      let rpcSucceeded = false;
      try {
        const { error: rpcErr } = await supabase.rpc('update_designer_profile', {
          target_designer_id: designerProfile.id,
          new_business_name: updatePayload.business_name,
          new_bio: updatePayload.bio,
          new_state: updatePayload.state,
          new_city: updatePayload.city,
          new_area: updatePayload.area,
          new_address: updatePayload.address,
          new_whatsapp: updatePayload.whatsapp,
          new_categories: updatePayload.categories,
          new_gender_focus: updatePayload.gender_focus,
        });
        if (!rpcErr) {
          rpcSucceeded = true;
        } else {
          // Retry without new_address if the RPC hasn't been re-created in SQL editor yet
          const { error: rpcRetryErr } = await supabase.rpc('update_designer_profile', {
            target_designer_id: designerProfile.id,
            new_business_name: updatePayload.business_name,
            new_bio: updatePayload.bio,
            new_state: updatePayload.state,
            new_city: updatePayload.city,
            new_area: updatePayload.area,
            new_whatsapp: updatePayload.whatsapp,
            new_categories: updatePayload.categories,
            new_gender_focus: updatePayload.gender_focus,
          });
          if (!rpcRetryErr) {
            rpcSucceeded = true;
          }
        }
      } catch (rpcErr) {
        console.warn('RPC update_designer_profile note:', rpcErr);
      }

      // 3. Fallback to direct supabase update if RPC is not present or failed
      if (!rpcSucceeded) {
        let { error } = await supabase
          .from('designer_profiles')
          .update(updatePayload)
          .eq('id', designerProfile.id);

        // If address or gender_focus column doesn't exist yet in Supabase schema, retry update without them
        if (error && (error.message?.toLowerCase().includes('column') || error.code === 'PGRST204')) {
          console.warn('Note: column not found in database, retrying update without address/gender...', error.message);
          const { gender_focus, address: _, ...safePayload } = updatePayload;
          const retryResult = await supabase
            .from('designer_profiles')
            .update(safePayload)
            .eq('id', designerProfile.id);
          error = retryResult.error;
        }

        if (error) throw error;
      }

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

      // Save locally for instant reflection
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tailoram_has_store_${designerProfile.id}`, String(hasStore));
        localStorage.setItem(`tailoram_store_name_${designerProfile.id}`, storeName.trim());
      }

      let { error } = await supabase
        .from('designer_profiles')
        .update({
          has_store: hasStore,
          store_name: storeName.trim() || null,
        })
        .eq('id', designerProfile.id);

      if (error && (error.message?.toLowerCase().includes('column') || error.code === 'PGRST204')) {
        console.warn('Store columns note:', error.message);
        error = null;
      }

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
  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'quoted');
  const activeProductionRequests = requests.filter((r) =>
    ['deposit_paid', 'in_progress', 'ready_for_balance', 'accepted'].includes(r.status)
  );
  const completedRequests = requests.filter((r) => r.status === 'completed');

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'all') return true;
    if (requestFilter === 'production') {
      return ['deposit_paid', 'in_progress', 'ready_for_balance', 'accepted'].includes(r.status);
    }
    return r.status === requestFilter;
  });

  const effectiveRating = designerProfile?.id
    ? computeEffectiveRating(designerProfile.id, reviews, manualRatings)
    : { rating: null, reviewCount: reviews.length, isOverridden: false };

  const avgRating =
    effectiveRating.rating !== null
      ? effectiveRating.rating.toFixed(1)
      : (reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 'New');
  const displayReviewCount = effectiveRating.reviewCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Impersonation Notice Bar */}
      {(isImpersonating || (typeof window !== 'undefined' && sessionStorage.getItem('tailoram_impersonating_admin'))) && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-amber-300 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-stone-950">
                  ⚡ Administrator Studio Access
                </span>
                <span className="text-[10px] bg-stone-950 text-amber-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Password Bypassed
                </span>
              </div>
              <p className="text-xs text-stone-900 font-semibold mt-0.5">
                Logged in as <strong>{designerProfile?.business_name || profile?.full_name}</strong>. You have full control to upload &amp; replace portfolio images, delete outdated items, edit RTW garments, and configure studio settings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={() => router.push('/admin')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-900 active:scale-95 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Return to Admin Panel</span>
            </button>
          </div>
        </div>
      )}

      {/* Designer Studio Header & Key Performance Bar */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Studio Avatar / Profile Picture with WhatsApp-Style Circle & Zoom */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="relative group shrink-0">
                <div
                  onClick={() => {
                    if (designerProfile?.profile_image_url) {
                      setZoomAvatarUrl(designerProfile.profile_image_url);
                    } else {
                      avatarInputRef.current?.click();
                    }
                  }}
                  title={designerProfile?.profile_image_url ? "Click to view full photo" : "Click to upload profile photo"}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full aspect-square overflow-hidden border-4 border-white shadow-xl ring-4 ring-amber-400/30 bg-stone-900 relative cursor-pointer group transition-all hover:scale-[1.02] flex items-center justify-center"
                >
                  {designerProfile?.profile_image_url ? (
                    <img
                      src={designerProfile.profile_image_url}
                      alt={designerProfile.business_name || 'Studio Logo'}
                      className={`w-full h-full ${
                        avatarFitMode === 'contain' ? 'object-contain p-1.5 sm:p-2' : 'object-cover'
                      } object-center group-hover:scale-105 transition-transform duration-300`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-600 to-amber-600 flex flex-col items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner">
                      <span>{(designerProfile?.business_name || profile?.full_name || 'T').charAt(0).toUpperCase()}</span>
                      <span className="text-[10px] font-semibold opacity-90 mt-1 uppercase tracking-wider">Add Photo</span>
                    </div>
                  )}

                  {/* Hover Overlay indicating click to zoom */}
                  {designerProfile?.profile_image_url && !avatarUploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-xs">
                      <Maximize2 className="w-6 h-6 text-amber-300" />
                      <span className="text-[11px] font-bold tracking-wide">View Photo</span>
                    </div>
                  )}

                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1">
                      <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-300">Uploading...</span>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Prominent Upload / Change Button & Fit Toggle */}
              <div className="flex flex-col sm:justify-center gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl bg-stone-900 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    <span>{designerProfile?.profile_image_url ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                  </button>

                  {designerProfile?.profile_image_url && (
                    <>
                      <button
                        type="button"
                        onClick={toggleAvatarFit}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                        title={avatarFitMode === 'contain' ? "Currently shrunk inside circle. Click to fill circle." : "Currently filling circle. Click to shrink into circle."}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                        <span>{avatarFitMode === 'contain' ? 'Fit in Circle' : 'Fill Circle'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomAvatarUrl(designerProfile?.profile_image_url ?? null)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>View</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 max-w-xs">
                  WhatsApp-style circular portrait. Aspect ratio 100% preserved. Click photo to zoom.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                  Designer Studio
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-500 font-medium bg-stone-100 px-3 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span>{designerProfile?.area || 'Lagos'}, {designerProfile?.state || 'Nigeria'}</span>
                </span>
                {(designerProfile?.address || address) && (
                  <span className="flex items-center gap-1 text-xs text-stone-600 font-medium bg-stone-100/90 border border-stone-200/60 px-3 py-1 rounded-full max-w-md truncate" title={designerProfile?.address || address}>
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Studio:</span>
                    <span className="truncate">{designerProfile?.address || address}</span>
                  </span>
                )}
                {(reviews.length > 0 || effectiveRating.isOverridden) && (
                  <span className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {avgRating} ({displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                {designerProfile?.business_name || profile?.full_name || 'My Tailor Brand'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
                  Manage client requests, showcase new outfits, and monitor feedback and rank.
                </p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Change profile picture
                </button>
              </div>

              {avatarSuccess && (
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {avatarSuccess}
                </p>
              )}
              {avatarError && (
                <p className="text-xs font-bold text-red-600 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {avatarError}
                </p>
              )}
            </div>
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
            <p className="text-2xl font-black text-emerald-600">{activeProductionRequests.length}</p>
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
          <span>Bespoke Orders ({requests.length + myRaisedRequests.length})</span>
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
            <div className="space-y-4">
              {coverSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                    <span>{coverSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverSuccessMessage(null)}
                    className="text-amber-700 hover:text-amber-950 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                      coverItemId === item.id ? 'border-amber-300 ring-2 ring-amber-400/30' : 'border-stone-200'
                    }`}
                  >
                    <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                      {item.media_type === 'video' ? (
                        <video
                          src={item.media_url}
                          controls
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <img
                          src={item.media_url}
                          alt={item.caption || 'Tailor work'}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      )}

                      {/* Quick Update Button overlay on image */}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-stone-900/80 hover:bg-stone-950 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide flex items-center gap-1.5 transition-all shadow-sm group/btn hover:scale-105"
                        title="Update photo, styling, or caption"
                      >
                        <Edit3 className="w-3 h-3 text-brand-400" />
                        <span>Update</span>
                      </button>

                      {/* Homepage Cover Badge or Quick Set Cover Button */}
                      {coverItemId === item.id ? (
                        <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-amber-500 text-stone-950 text-[10px] font-black tracking-wide flex items-center gap-1 shadow-md backdrop-blur-sm">
                          <Star className="w-3 h-3 fill-stone-950" />
                          <span>Homepage Cover</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCoverItem(item);
                          }}
                          className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-stone-900/85 hover:bg-amber-500 hover:text-stone-950 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 transition-all shadow-sm opacity-90 sm:opacity-0 group-hover:opacity-100 hover:scale-105 backdrop-blur-sm"
                          title="Start your homepage studio badge with this outfit photo"
                        >
                          <Star className="w-3 h-3 text-amber-400 group-hover:text-stone-950" />
                          <span>Set as Cover</span>
                        </button>
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
                      <div>
                        {(item as any).category && (
                          <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                            {((item as any).category || '').replace('_', ' ')}
                          </span>
                        )}
                        <p className="text-xs sm:text-sm text-stone-800 font-medium line-clamp-2">
                          {item.caption || 'Custom tailored creation'}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-medium">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {coverItemId === item.id ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold"
                              title="This photo currently starts your studio badge on the homepage"
                            >
                              <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                              <span>Cover</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCoverItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-50 hover:bg-amber-50 text-stone-600 hover:text-amber-800 border border-stone-200/80 text-[10px] font-semibold transition-colors"
                              title="Set this photo to start your studio badge on the homepage"
                            >
                              <Star className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                              <span>Cover</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-brand-50 text-stone-700 hover:text-brand-700 border border-stone-200/80 text-[11px] font-semibold transition-colors"
                            title="Update photo, styling, or caption"
                          >
                            <Edit3 className="w-3 h-3 text-brand-600" />
                            <span>Update</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            disabled={deletingId === item.id}
                            className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BESPOKE ORDERS (RECEIVED & RAISED) */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Header Switcher: Received Commissions vs Orders Raised */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setRequestViewMode('received')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  requestViewMode === 'received'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Inbox className="w-4 h-4 text-brand-600" />
                <span>Commissions Received ({requests.length})</span>
                {pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                    {pendingRequests.length} new
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRequestViewMode('raised')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  requestViewMode === 'raised'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Scissors className="w-4 h-4 text-amber-600" />
                <span>Orders Raised by Me ({myRaisedRequests.length})</span>
              </button>
            </div>

            {/* Raise New Order Button */}
            <button
              type="button"
              onClick={() => {
                setRaiseOrderModalOpen(true);
                setRaiseOrderError('');
                setRaiseOrderSuccess('');
              }}
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Raise New Bespoke Order</span>
            </button>
          </div>

          {requestViewMode === 'received' ? (
            <div className="space-y-6">
              {/* Status filter tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'all', label: `All (${requests.length})` },
              { id: 'pending', label: `New Inquiries (${pendingRequests.length})` },
              { id: 'production', label: `In Production (${activeProductionRequests.length})` },
              { id: 'quoted', label: `Quoted (${requests.filter((r) => r.status === 'quoted').length})` },
              { id: 'completed', label: `Completed (${completedRequests.length})` },
              { id: 'declined', label: `Declined (${requests.filter((r) => r.status === 'declined').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRequestFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  requestFilter === tab.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {tab.label}
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
              {filteredRequests.map((req) => {
                const breakdown = calculatePaymentBreakdown(req.quoted_price || req.budget_min);
                const hasReviewedClient = reviewedClientIds.includes(req.id);
                const isUpdatingThis = updatingRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              req.status === 'completed'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : req.status === 'ready_for_balance'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : req.status === 'deposit_paid' || req.status === 'in_progress'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : req.status === 'quoted'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : req.status === 'declined'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {req.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-stone-400 font-medium">
                            Received {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 text-base">
                          Client: {req.client?.full_name || 'Fashion Client'}
                        </h3>
                      </div>

                      <div className="text-right">
                        {req.quoted_price ? (
                          <div className="text-sm font-black text-amber-700">
                            Quoted: ₦{req.quoted_price.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm font-extrabold text-stone-900">
                            Budget: ₦{req.budget_min.toLocaleString()}
                            {req.budget_max ? ` - ₦${req.budget_max.toLocaleString()}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description & specs */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-2 text-xs text-stone-700">
                      <p className="font-medium leading-relaxed">{req.style_description}</p>
                      
                      {/* Quote financial breakdown if exists */}
                      {req.quoted_price && (
                        <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 text-[11px] text-stone-700 flex flex-wrap gap-4 font-semibold">
                          <span>Deposit (40%): <strong className="text-emerald-700 font-bold">₦{(req.deposit_amount || breakdown.depositAmount).toLocaleString()}</strong></span>
                          <span>Balance (60%): <strong className="text-purple-700 font-bold">₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()}</strong></span>
                          {req.quote_deadline && (
                            <span>Target Date: <strong className="text-stone-900">{new Date(req.quote_deadline).toLocaleDateString()}</strong></span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-stone-500 pt-1 font-medium">
                        {req.fabric && (
                          <span>Fabric: <strong className="text-stone-800">{req.fabric}</strong></span>
                        )}
                        {req.deadline && (
                          <span>Needed By: <strong className="text-stone-800">{new Date(req.deadline).toLocaleDateString()}</strong></span>
                        )}
                      </div>

                      {req.reference_image_url && (
                        <div className="pt-1">
                          <span className="font-semibold text-stone-500 block mb-1">Client Inspo:</span>
                          <img
                            src={req.reference_image_url}
                            alt="Reference Style"
                            className="w-20 h-20 object-cover rounded-xl border border-stone-200"
                          />
                        </div>
                      )}

                      {/* Client Body Measurements if provided */}
                      {req.measurements && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMeasurementsRequest(req);
                              setMeasurementsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Ruler className="w-3.5 h-3.5 text-amber-700" />
                            <span>View Client Measurements</span>
                          </button>
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
                        Chat Consultation
                      </Link>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Pending: Send Quote / Accept / Decline */}
                        {req.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetQuoteRequest(req);
                                setQuoteModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-brand-600/20 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-300" />
                              <span>Send Quote</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'accepted')}
                              disabled={isUpdatingThis}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept Direct
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'declined')}
                              disabled={isUpdatingThis}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                              Decline
                            </button>
                          </>
                        )}

                        {/* Quoted: Awaiting Client */}
                        {req.status === 'quoted' && (
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                            Quote Sent (₦{req.quoted_price?.toLocaleString()}) • Waiting for Client
                          </span>
                        )}

                        {/* Accepted: Awaiting Deposit */}
                        {req.status === 'accepted' && (
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            Quote Accepted • Waiting for 40% Deposit Payment
                          </span>
                        )}

                        {/* Deposit Paid / In Progress: Mark Ready for Balance */}
                        {(req.status === 'deposit_paid' || req.status === 'in_progress') && (
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleMarkReadyForBalanceFromDashboard(req.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Mark Ready for Balance</span>
                          </button>
                        )}

                        {/* Ready for Balance: Waiting for final payment */}
                        {req.status === 'ready_for_balance' && (
                          <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            Ready • Waiting for Client 60% Balance (₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()})
                          </span>
                        )}

                        {/* Completed: Review Client */}
                        {req.status === 'completed' && !hasReviewedClient && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetReviewRequest(req);
                              setReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-stone-950" />
                            <span>Review Client</span>
                          </button>
                        )}

                        {req.status === 'completed' && hasReviewedClient && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Client Reviewed
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
          ) : (
            /* --- ORDERS RAISED BY ME (Designer as Client/Buyer) --- */
            <div className="space-y-4">
              {loadingRaisedRequests ? (
                <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <p className="text-sm font-semibold">Loading orders you raised...</p>
                </div>
              ) : myRaisedRequests.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
                  <Scissors className="w-10 h-10 text-stone-300 mx-auto" />
                  <h3 className="font-bold text-base text-stone-900">
                    No Bespoke Orders Raised Yet
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    As a designer, you can commission master tailors across Nigeria for specialized crafts, Agbada embroidery, Aso Oke weaving, or bespoke garments.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRaiseOrderModalOpen(true);
                      setRaiseOrderError('');
                      setRaiseOrderSuccess('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Raise Your First Order</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRaisedRequests.map((req) => {
                    const breakdown = calculatePaymentBreakdown(req.quoted_price || req.budget_min);
                    const isActionLoading = actionLoadingId === req.id;
                    const atelier = req.designer;

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            {/* Atelier Avatar */}
                            <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                              {atelier?.profile_image_url ? (
                                <img
                                  src={atelier.profile_image_url}
                                  alt={atelier.business_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-black text-amber-400 text-lg">
                                  {atelier?.business_name ? atelier.business_name.charAt(0) : 'T'}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    req.status === 'completed'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : req.status === 'ready_for_balance'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : req.status === 'deposit_paid' || req.status === 'in_progress'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : req.status === 'accepted'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : req.status === 'quoted'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                      : req.status === 'declined'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                                  }`}
                                >
                                  {req.status === 'quoted' ? 'Quote Received - Review Below' : req.status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-stone-400 font-medium">
                                  Raised {new Date(req.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-stone-900 text-base">
                                  {atelier?.business_name || 'Commissioned Atelier'}
                                </h3>
                                {atelier?.state && (
                                  <span className="text-xs text-stone-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-brand-600" />
                                    <span>{atelier.area ? `${atelier.area}, ` : ''}{atelier.state}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Budget / Quoted Price */}
                          <div className="text-right">
                            {req.quoted_price ? (
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 block">Official Studio Quote</span>
                                <div className="text-base font-black text-amber-700">
                                  ₦{req.quoted_price.toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 block">Your Budget</span>
                                <div className="text-sm font-extrabold text-stone-900">
                                  ₦{req.budget_min.toLocaleString()}
                                  {req.budget_max ? ` - ₦${req.budget_max.toLocaleString()}` : ''}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Description & Reference Image */}
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-3 text-xs text-stone-700">
                          <p className="font-medium leading-relaxed">{req.style_description}</p>

                          {/* Quoted financial breakdown banner if quoted/deposit_paid */}
                          {req.quoted_price && (
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-stone-800 space-y-1.5">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                                <span>Quote Breakdown:</span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-[11px]">
                                <span>40% Commitment Deposit: <strong className="text-emerald-700 font-bold">₦{(req.deposit_amount || breakdown.depositAmount).toLocaleString()}</strong></span>
                                <span>60% Completion Balance: <strong className="text-purple-700 font-bold">₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()}</strong></span>
                                {req.quote_deadline && (
                                  <span>Estimated Completion: <strong className="text-stone-900 font-bold">{new Date(req.quote_deadline).toLocaleDateString()}</strong></span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                            {req.fabric && (
                              <span>Fabric: <strong className="text-stone-800">{req.fabric}</strong></span>
                            )}
                            {req.deadline && (
                              <span>Delivery Deadline: <strong className="text-stone-800">{new Date(req.deadline).toLocaleDateString()}</strong></span>
                            )}
                            {req.measurements && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMeasurementsRequest(req);
                                  setMeasurementsModalOpen(true);
                                }}
                                className="text-brand-700 hover:text-brand-800 font-bold flex items-center gap-1 underline cursor-pointer"
                              >
                                <Ruler className="w-3.5 h-3.5" />
                                <span>View Measurements Included</span>
                              </button>
                            )}
                            {req.reference_image_url && (
                              <a
                                href={req.reference_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-700 hover:text-brand-800 font-bold flex items-center gap-1 underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Reference Photo</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Interactive Client Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <Link
                            href={`/messages/${req.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                            <span>Consultation Chat</span>
                          </Link>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* If quoted: Accept or Decline */}
                            {req.status === 'quoted' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeclineQuoteRaised(req)}
                                  disabled={isActionLoading}
                                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  Decline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptQuoteAndPayRaised(req)}
                                  disabled={isActionLoading}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                  {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  <span>Accept &amp; Pay Deposit (₦{(req.deposit_amount || breakdown.depositAmount).toLocaleString()})</span>
                                </button>
                              </>
                            )}

                            {/* If accepted but deposit not paid yet */}
                            {req.status === 'accepted' && (
                              <button
                                type="button"
                                onClick={() => handleOpenRaisedPayment(req, 'deposit')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay 40% Deposit (₦{(req.deposit_amount || breakdown.depositAmount).toLocaleString()})</span>
                              </button>
                            )}

                            {/* If ready for balance */}
                            {req.status === 'ready_for_balance' && (
                              <button
                                type="button"
                                onClick={() => handleOpenRaisedPayment(req, 'balance')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Pay 60% Balance (₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()})</span>
                              </button>
                            )}

                            {/* If completed: Leave Review */}
                            {req.status === 'completed' && user && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetReviewRequest(req);
                                  setReviewModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold shadow-sm transition-all cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-400" />
                                <span>Review Atelier</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
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
                  {displayReviewCount} {displayReviewCount === 1 ? 'Review' : 'Reviews'}
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
                        {resolveReviewClientName(rev)}
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

            {/* Studio Avatar / Profile Picture Upload Field */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => designerProfile?.profile_image_url && setZoomAvatarUrl(designerProfile.profile_image_url ?? null)}
                  className={`w-20 h-20 rounded-full aspect-square overflow-hidden border-4 border-white shadow-md ring-2 ring-stone-200 bg-stone-900 shrink-0 relative flex items-center justify-center ${
                    designerProfile?.profile_image_url ? 'cursor-pointer group' : ''
                  }`}
                  title={designerProfile?.profile_image_url ? "Click to view full photo" : undefined}
                >
                  {designerProfile?.profile_image_url ? (
                    <>
                      <img
                        src={designerProfile.profile_image_url}
                        alt={businessName || 'Studio Avatar'}
                        className={`w-full h-full ${
                          avatarFitMode === 'contain' ? 'object-contain p-1' : 'object-cover'
                        } object-center group-hover:scale-105 transition-transform duration-300`}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 className="w-4 h-4 text-amber-300" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-brand-100 text-brand-800 flex items-center justify-center font-black text-xl">
                      {(businessName || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Studio Profile Picture / Logo</h4>
                  <p className="text-[11px] text-stone-500">
                    Circular WhatsApp-style portrait displayed across Tailoram. Click photo to zoom.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span>{designerProfile?.profile_image_url ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                </button>
              </div>
            </div>

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

            {/* Full Physical Business Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Full Studio / Business Address
                </label>
                <span className="text-[10px] text-stone-400">
                  Physical atelier location
                </span>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Suite 4, Admiralty Way, Lekki Phase 1 / 14 Allen Avenue, Ikeja"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Visible to clients booking consultations, custom fittings, or delivering fabrics.
              </p>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  WhatsApp Phone Number
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  Auto-formats to +234
                </span>
              </div>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatNigerianPhoneForInput(e.target.value))}
                placeholder="+234 801 234 5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Enter local number (e.g. 080...); country code is added automatically.
              </p>
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

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Target Audience / Gender Wear Specialty <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setGenderFocus('male')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                    genderFocus === 'male'
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span>♂</span> Men&apos;s Fashion
                  </span>
                  <span className="text-[11px] text-stone-500 leading-snug">
                    Agbada, Senator suits, Kaftans &amp; native wear
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFocus('female')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                    genderFocus === 'female'
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span>♀</span> Women&apos;s Fashion
                  </span>
                  <span className="text-[11px] text-stone-500 leading-snug">
                    Aso Ebi, Owambe lace gowns, Ankara &amp; Bridal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFocus('unisex')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                    genderFocus === 'unisex'
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span>⚧</span> Both Men &amp; Women
                  </span>
                  <span className="text-[11px] text-stone-500 leading-snug">
                    Mixed bespoke collections &amp; native wear
                  </span>
                </button>
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

      {/* UPLOAD MODAL (Supports Multiple Photos or Single Video Reel) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Upload Portfolio Work
              </h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                  previewItems.forEach((p) => URL.revokeObjectURL(p.url));
                  setPreviewItems([]);
                  setUploadError('');
                  setUploadProgressText('');
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
                    setUploadFiles([]);
                    previewItems.forEach((p) => URL.revokeObjectURL(p.url));
                    setPreviewItems([]);
                    setUploadError('');
                  }}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    uploadMediaType === 'image'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                  Outfit Photos (Multi-Select)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('video');
                    setUploadFiles([]);
                    previewItems.forEach((p) => URL.revokeObjectURL(p.url));
                    setPreviewItems([]);
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
                  {uploadMediaType === 'video'
                    ? 'Select Video Reel (.mp4, .mov)'
                    : 'Select One or Multiple Photos (.jpg, .png, .webp)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple={uploadMediaType === 'image'}
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
                    ? 'Upload short video clips (up to 40MB) showing 360° outfit fit and movement.'
                    : 'Tip: You can select multiple photos at once. Photos are auto-compressed to WebP for fast Nigerian mobile loading.'}
                </p>
              </div>

              {/* Multi-Photo Preview Gallery with Individual Captioning */}
              {previewItems.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-600" />
                      {previewItems.length} {previewItems.length === 1 ? 'file' : 'photos'} ready to upload
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFiles([]);
                        previewItems.forEach((p) => URL.revokeObjectURL(p.url));
                        setPreviewItems([]);
                      }}
                      className="text-[11px] text-red-500 hover:underline font-semibold"
                    >
                      Clear all
                    </button>
                  </div>

                  {uploadMediaType === 'video' ? (
                    <div className="aspect-[4/3] bg-stone-900 rounded-2xl overflow-hidden relative border border-stone-200">
                      <video src={previewItems[0].url} controls playsInline className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto p-2 rounded-2xl bg-stone-50 border border-stone-200 divide-y divide-stone-200/70">
                      {previewItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="pt-2 first:pt-0 flex items-center gap-3 group"
                        >
                          {/* Thumbnail with remove button overlay */}
                          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-stone-200 bg-stone-900 shrink-0">
                            <img
                              src={item.url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePreviewItem(item.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[10px] shadow-md transition-transform active:scale-90"
                              title="Remove this photo"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/75 text-[9px] font-black text-white">
                              #{idx + 1}
                            </span>
                          </div>

                          {/* Individual Caption Input */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-stone-700 truncate">
                                Caption for Photo #{idx + 1}
                              </label>
                              <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                                {item.file.name}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={item.caption ?? ''}
                              onChange={(e) => updatePreviewCaption(item.id, e.target.value)}
                              placeholder={caption.trim() ? `Default: "${caption.trim()}"` : `e.g. Front embroidery details, matching fila cap...`}
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-stone-400 placeholder:italic"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploadMediaType === 'image' && previewItems.length > 1 && (
                    <p className="text-[11px] text-stone-500">
                      💡 <strong>Tip:</strong> You can give each photo its own distinct caption above, or set a general caption below to apply to any photos left blank.
                    </p>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    {uploadMediaType === 'video'
                      ? 'Video Reel Caption / Style Description'
                      : previewItems.length > 1
                      ? 'General / Default Caption (Applied to photos without individual captions)'
                      : 'Caption / Style Description'}
                  </label>
                </div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. 3-piece Royal Agbada with custom embroidery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {uploadProgressText && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                  <span>{uploadProgressText}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setUploadFiles([]);
                    previewItems.forEach((p) => URL.revokeObjectURL(p.url));
                    setPreviewItems([]);
                  }}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadFiles.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading ({uploadFiles.length})...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {uploadFiles.length > 1
                        ? `Upload ${uploadFiles.length} Photos`
                        : 'Upload Work'}
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

      {/* EDIT / UPDATE PORTFOLIO ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-600" />
                  Update Portfolio Work
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Replace the outfit photo/video, change style category, or update the caption.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {updateError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {updateSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{updateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateItemSubmit} className="space-y-4">
              {/* Media Preview & Replace Button */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Portfolio Media (Photo or Video)
                </label>
                
                <div className="relative aspect-[16/11] bg-stone-950 rounded-2xl overflow-hidden border border-stone-200 shadow-inner group">
                  {editPreviewUrl ? (
                    editReplacementFile?.type.startsWith('video/') ? (
                      <video
                        src={editPreviewUrl}
                        controls
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <img
                        src={editPreviewUrl}
                        alt="New preview"
                        className="w-full h-full object-cover object-top"
                      />
                    )
                  ) : editingItem.media_type === 'video' ? (
                    <video
                      src={editingItem.media_url}
                      controls
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <img
                      src={editingItem.media_url}
                      alt={editingItem.caption || 'Current portfolio item'}
                      className="w-full h-full object-cover object-top"
                    />
                  )}

                  {/* Overlay badge indicating replacement state */}
                  {editReplacementFile ? (
                    <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      New media selected
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm">
                      Current {editingItem.media_type === 'video' ? 'Video' : 'Photo'}
                    </div>
                  )}

                  {/* Action buttons inside media container */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {editReplacementFile && (
                      <button
                        type="button"
                        onClick={() => {
                          if (editPreviewUrl && editPreviewUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(editPreviewUrl);
                          }
                          setEditReplacementFile(null);
                          setEditPreviewUrl(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-semibold backdrop-blur-sm shadow transition-all"
                      >
                        Reset Media
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editReplacementFile ? 'Choose Different File' : 'Replace Photo/Video'}</span>
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleEditFileChange}
                  className="hidden"
                />

                {editReplacementFile ? (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected replacement: {editReplacementFile.name} ({(editReplacementFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-400 mt-1.5">
                    Click "Replace Photo/Video" above to upload a new image or video for this garment.
                  </p>
                )}
              </div>

              {/* Style Category */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Style Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
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

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Caption / Outfit Description
                </label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="e.g. Royal Emerald Agbada with Gold embroidery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Homepage Cover Selector Checkbox */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="editIsCover"
                  checked={editIsCover}
                  onChange={(e) => setEditIsCover(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-stone-300 cursor-pointer"
                />
                <label htmlFor="editIsCover" className="text-xs text-stone-800 font-medium cursor-pointer select-none">
                  <span className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    Start homepage badge with this photo (Homepage Cover)
                  </span>
                  <span className="text-stone-500 block text-[11px] mt-0.5">
                    This photo will be the leading image displayed on your atelier card on the Tailoram marketplace homepage.
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingItem}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {isUpdatingItem ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Updates...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Circular Avatar Zoom Modal */}
      {zoomAvatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomAvatarUrl(null)}
        >
          {/* Top right floating close button */}
          <button
            type="button"
            onClick={() => setZoomAvatarUrl(null)}
            className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full bg-stone-900/90 hover:bg-stone-800 text-white flex items-center justify-center border border-stone-700 shadow-2xl transition-transform active:scale-95 cursor-pointer"
            aria-label="Close"
            title="Close (Esc)"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="relative max-w-lg w-full flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {designerProfile?.business_name || profile?.full_name || 'Studio Profile Photo'}
              </h3>
              <p className="text-xs text-stone-400">
                Official Studio Profile Photo on Tailoram
              </p>
            </div>

            {/* Full photo view without the circle */}
            <div className="relative max-w-2xl w-full max-h-[75vh] rounded-3xl overflow-hidden border-2 border-stone-800 shadow-2xl bg-stone-950 flex items-center justify-center p-2 sm:p-4">
              <img
                src={zoomAvatarUrl}
                alt={designerProfile?.business_name || 'Studio Profile'}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-lg"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setZoomAvatarUrl(null);
                  avatarInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-600/30 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                <span>Change Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomAvatarUrl(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Submission Modal */}
      {targetQuoteRequest && user && (
        <QuoteModal
          isOpen={quoteModalOpen}
          onClose={() => {
            setQuoteModalOpen(false);
            setTargetQuoteRequest(null);
          }}
          request={targetQuoteRequest}
          designerUserId={user.id}
          onQuoteSubmitted={() => {
            if (designerProfile?.id) loadRequests(designerProfile.id);
          }}
        />
      )}

      {/* Bidirectional Review Modal for Designer to Client */}
      {targetReviewRequest && user && (
        <OrderReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setTargetReviewRequest(null);
          }}
          request={targetReviewRequest}
          reviewerId={user.id}
          reviewerName={designerProfile?.business_name || profile?.full_name || 'Atelier'}
          revieweeId={targetReviewRequest.client_id}
          revieweeName={targetReviewRequest.client?.full_name || 'Client'}
          isClientReviewingDesigner={false}
          onReviewSubmitted={() => {
            if (designerProfile?.id) loadRequests(designerProfile.id);
          }}
        />
      )}

      {/* Client Measurements Inspection Modal */}
      {selectedMeasurementsRequest?.measurements && (
        <MeasurementsModal
          isOpen={measurementsModalOpen}
          onClose={() => {
            setMeasurementsModalOpen(false);
            setSelectedMeasurementsRequest(null);
          }}
          measurements={selectedMeasurementsRequest.measurements}
          clientName={selectedMeasurementsRequest.client?.full_name || 'Client'}
          orderNumber={selectedMeasurementsRequest.id.slice(0, 8)}
        />
      )}

      {/* Payment Modal for Orders Raised by Designer */}
      {selectedRaisedPaymentRequest && user && (
        <PaymentModal
          isOpen={raisedPaymentModalOpen}
          onClose={() => {
            setRaisedPaymentModalOpen(false);
            setSelectedRaisedPaymentRequest(null);
          }}
          request={selectedRaisedPaymentRequest}
          type={raisedPaymentType}
          customerEmail={user.email || 'designer@tailoram.com'}
          customerName={profile?.full_name || designerProfile?.business_name || 'Designer'}
          onPaymentSuccess={() => {
            if (user?.id) loadRaisedRequests(user.id);
            setRaisedPaymentModalOpen(false);
            setSelectedRaisedPaymentRequest(null);
          }}
        />
      )}

      {/* RAISE NEW BESPOKE ORDER MODAL */}
      {raiseOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-brand-600" />
                  <span>Raise New Bespoke Order</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Commission custom tailoring from a master atelier on Tailoram
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRaiseOrderModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {raiseOrderError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{raiseOrderError}</span>
              </div>
            )}

            {raiseOrderSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{raiseOrderSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRaiseOrder} className="space-y-4">
              {/* Select Target Designer Atelier */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Select Designer Atelier <span className="text-red-500">*</span>
                </label>
                <select
                  value={raiseTargetDesignerId}
                  onChange={(e) => setRaiseTargetDesignerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  <option value="">-- Choose a Master Tailor or Atelier --</option>
                  {allDesignersList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.business_name} ({d.area ? `${d.area}, ` : ''}{d.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Style Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Style Description &amp; Specifications <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={raiseStyleDescription}
                  onChange={(e) => setRaiseStyleDescription(e.target.value)}
                  placeholder="e.g. 3-Piece Navy Blue Agbada with golden chest embroidery and matching Fila cap..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Fabric & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Fabric Type / Preference
                  </label>
                  <input
                    type="text"
                    value={raiseFabric}
                    onChange={(e) => setRaiseFabric(e.target.value)}
                    placeholder="e.g. 7-Star Guinea Brocade, Cashmere"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={raiseDeadline}
                    onChange={(e) => setRaiseDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Budget Min & Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Minimum Budget (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={raiseBudgetMin}
                    onChange={(e) => setRaiseBudgetMin(e.target.value)}
                    placeholder="45000"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Maximum Budget (₦)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={raiseBudgetMax}
                    onChange={(e) => setRaiseBudgetMax(e.target.value)}
                    placeholder="75000 (optional)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              {/* Reference / Inspo Photo */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Reference / Inspiration Photo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={raiseFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setRaiseReferenceFile(file);
                        setRaisePreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => raiseFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-brand-600" />
                    <span>{raiseReferenceFile ? 'Change Photo' : 'Upload Reference Photo'}</span>
                  </button>

                  {raisePreviewUrl && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-200">
                      <img src={raisePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setRaiseReferenceFile(null);
                          setRaisePreviewUrl(null);
                          if (raiseFileInputRef.current) raiseFileInputRef.current.value = '';
                        }}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Body Measurements Toggle */}
              <div className="pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRaiseShowMeasurements(!raiseShowMeasurements)}
                  className="flex items-center justify-between w-full text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-4 h-4" />
                    <span>Include Body Measurements (Optional)</span>
                  </span>
                  {raiseShowMeasurements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {raiseShowMeasurements && (
                  <div className="mt-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <p className="text-[11px] text-stone-500">Enter measurements in inches (&quot;):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'chest', label: 'Chest' },
                        { key: 'shoulder', label: 'Shoulder' },
                        { key: 'sleeve', label: 'Sleeve' },
                        { key: 'neck', label: 'Neck' },
                        { key: 'waist', label: 'Waist' },
                        { key: 'hips', label: 'Hips' },
                        { key: 'top_length', label: 'Top Length' },
                        { key: 'trouser_length', label: 'Trouser' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">{f.label}</label>
                          <input
                            type="text"
                            placeholder='e.g. 42"'
                            value={(raiseMeasurements as any)[f.key] || ''}
                            onChange={(e) =>
                              setRaiseMeasurements({
                                ...raiseMeasurements,
                                [f.key]: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRaiseOrderModalOpen(false)}
                  disabled={isSubmittingRaiseOrder}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRaiseOrder}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSubmittingRaiseOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Commission Order</span>
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
