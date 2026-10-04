'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DesignerProfile,
  Profile,
  OutfitRequest,
  StoreProduct,
  Review,
  AnalyticsEvent,
  NIGERIAN_STATES,
  GENDER_FOCUS_OPTIONS,
  FASHION_CATEGORIES,
  UserRole,
} from '@/lib/types';
import {
  fetchManualRatings,
  saveManualRating,
  removeManualRating,
  computeEffectiveRating,
  mergeWithLocalReviews,
  resolveReviewClientName,
  ManualRatingData,
} from '@/lib/ratingsManager';
import { fetchCloudRequestOverrides } from '@/lib/payments';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Scissors,
  ShoppingBag,
  LogIn,
  Star,
  Activity,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Package,
  Eye,
  Trash2,
  Edit3,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Key,
  ExternalLink,
  MessageSquare,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  Layers,
  ChevronRight,
  Check,
  X,
  Volume2,
  Loader2,
  Mail,
  Send,
  EyeOff,
  ArrowUpDown,
  SlidersHorizontal,
  BellRing,
  Radio,
  Smartphone,
  Image as ImageIcon,
  Globe,
} from 'lucide-react';
import {
  getEmailSettings,
  saveEmailSettings,
  getEmailLogs,
  clearEmailLogs,
  EmailSettings,
  EmailNotificationLog,
  triggerEmailNotification,
  DEFAULT_EMAIL_SETTINGS,
} from '@/lib/emailNotifications';
import {
  getAdminPushBroadcasts,
  sendAdminPushBroadcast,
  deleteAdminPushBroadcast,
  sendPushNotification,
  requestPushPermission,
  isPushSupported,
  getPushPermissionStatus,
  AdminPushBroadcast,
} from '@/lib/pushNotifications';
import {
  getCommissionSettings,
  saveCommissionSettings,
  DEFAULT_COMMISSION_SETTINGS,
} from '@/lib/paystack';
import { CommissionSettings } from '@/lib/types';
import {
  HomepageSortOption,
  HOMEPAGE_SORT_OPTIONS,
  saveHomepageDefaultSort,
} from '@/lib/homepageSettings';


const DEMO_EMAILS_MAP: Record<string, string> = {
  '11111111-1111-1111-1111-111111111101': 'dele.couture@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111102': 'maryam.bello@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111103': 'emeka.craft@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111104': 'yewande.adire@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111105': 'zainab.kaftan@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111106': 'chidinma.bridal@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222201': 'tunde.balogun@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222202': 'amina.mohammed@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222203': 'ngozi.eze@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222204': 'femi.adeyemi@demo.tailoram.com',
};

const ALL_DEMO_EMAILS = Object.values(DEMO_EMAILS_MAP);

const PUSH_IMAGE_PRESETS = [
  {
    name: 'Emerald Agbada',
    url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80',
    tag: 'Agbada • Men',
  },
  {
    name: 'Champagne Aso Ebi',
    url: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1000&q=80',
    tag: 'Aso Ebi • Lace',
  },
  {
    name: 'Senator Native',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
    tag: 'Senator • Luxury',
  },
  {
    name: 'Indigo Adire Silk',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
    tag: 'Adire • Craft',
  },
  {
    name: 'George Bridal Glam',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
    tag: 'Bridal • Owambe',
  },
];

export default function AdminPage() {
  const { user, profile, refreshProfile, impersonateUser } = useAuth();
  const router = useRouter();

  // Authentication & Gatekeeper State
  const [passkeyInput, setPasskeyInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [isElevatingRole, setIsElevatingRole] = useState(false);

  // Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Tailoram2026!');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);

  // Manual Designer Rating Override Modal State
  const [manualRatings, setManualRatings] = useState<Record<string, ManualRatingData>>({});
  const [ratingModalDesigner, setRatingModalDesigner] = useState<DesignerProfile | null>(null);
  const [ratingInput, setRatingInput] = useState<number>(5.0);
  const [reviewCountInput, setReviewCountInput] = useState<number>(10);
  const [ratingNotesInput, setRatingNotesInput] = useState<string>('');
  const [isSavingRating, setIsSavingRating] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'designers' | 'users' | 'requests' | 'products' | 'reviews' | 'events' | 'emails' | 'push' | 'settings'
  >('analytics');

  // Push Notification Broadcast State
  const [pushBroadcasts, setPushBroadcasts] = useState<AdminPushBroadcast[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('✨ Exclusive Nigerian Luxury Attire Drop');
  const [broadcastBody, setBroadcastBody] = useState('Explore handcrafted Agbada, Senator sets, and Aso Ebi couture directly from master artisans across Nigeria.');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'designers' | 'clients'>('all');
  const [broadcastLink, setBroadcastLink] = useState('/shop');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [isTestingLocalPush, setIsTestingLocalPush] = useState(false);

  // Email Notifications State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('admin@tailoram.com');
  const [testEmailEvent, setTestEmailEvent] = useState<
    'new_request' | 'quote_received' | 'deposit_paid' | 'order_ready' | 'balance_paid' | 'new_message'
  >('new_request');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Platform Commission & Paystack Split Settings State
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>(DEFAULT_COMMISSION_SETTINGS);
  const [isSavingCommission, setIsSavingCommission] = useState(false);


  // Core Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [designers, setDesigners] = useState<DesignerProfile[]>([]);
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [requestsList, setRequestsList] = useState<OutfitRequest[]>([]);
  const [productsList, setProductsList] = useState<StoreProduct[]>([]);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [eventsList, setEventsList] = useState<AnalyticsEvent[]>([]);
  const [platformSettings, setPlatformSettings] = useState<{
    announcement_enabled: boolean;
    announcement_message: string;
    announcement_type: 'info' | 'spotlight' | 'warning';
    maintenance_mode: boolean;
    whatsapp_enabled: boolean;
    homepage_default_sort: HomepageSortOption;
  }>({
    announcement_enabled: true,
    announcement_message: "✨ Welcome to Tailoram: Nigeria's premier bespoke couture network. Explore top studios across all 36 states!",
    announcement_type: 'info',
    maintenance_mode: false,
    whatsapp_enabled: false,
    homepage_default_sort: 'ranking',
  });

  // Action / Feedback Notification
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Check stored unlock or role on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('tailoram_admin_session');
      if (stored === 'granted' || profile?.role === 'admin') {
        setIsUnlocked(true);
      }
    }
  }, [profile?.role]);

  // Master Data Fetcher
  const fetchAllAdminData = async () => {
    try {
      setRefreshing(true);

      // 1. Designers
      const { data: dData, error: dErr } = await supabase
        .from('designer_profiles')
        .select('*, profiles:user_id(full_name), portfolio_items(*), reviews(*), store_products(*)')
        .order('created_at', { ascending: false });

      if (!dErr && dData) {
        const deletedDesignerIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('tailoram_deleted_designer_profiles') || '[]')
          : [];
        const storedUpdatedProfiles: Record<string, any> = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('tailoram_updated_designer_profiles') || '{}')
          : {};
        const activeDesigners = (dData as DesignerProfile[])
          .filter((d) => !deletedDesignerIds.includes(d.id))
          .map((d) => {
            const localUpdates = storedUpdatedProfiles[d.id] || {};
            return {
              ...d,
              ...localUpdates,
            };
          });
        setDesigners(activeDesigners);
      }

      // 2. Profiles (Users)
      const { data: pData, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pErr && pData) {
        const deletedUserIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('tailoram_deleted_user_profiles') || '[]')
          : [];
        const activeProfiles = (pData as Profile[]).filter((p) => !deletedUserIds.includes(p.id));
        setProfilesList(activeProfiles);
      }

      // 3. Bespoke Requests
      const { data: rData, error: rErr } = await supabase
        .from('requests')
        .select('*, client:client_id(full_name), designer:designer_id(*)')
        .order('created_at', { ascending: false });

      if (!rErr && rData) {
        const cloudOverrides = await fetchCloudRequestOverrides();
        const mergedReqs = (rData as OutfitRequest[]).map((r) => ({
          ...r,
          ...(cloudOverrides[r.id] || {}),
        }));
        setRequestsList(mergedReqs);
      }

      // 4. Products (RTW)
      const { data: prodData, error: prodErr } = await supabase
        .from('store_products')
        .select('*, designer:designer_id(business_name, state)')
        .order('created_at', { ascending: false });

      if (!prodErr && prodData) {
        setProductsList(prodData as StoreProduct[]);
      }

      // 5. Reviews
      const { data: revData, error: revErr } = await supabase
        .from('reviews')
        .select('*, client:client_id(full_name), designer:designer_id(business_name)')
        .order('created_at', { ascending: false });

      const rawRevs = (revData as Review[]) || [];
      const mergedRevs = mergeWithLocalReviews(rawRevs);
      setReviewsList(mergedRevs);

      // 6. Analytics Events
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!evErr && evData) {
        setEventsList(evData as AnalyticsEvent[]);
      }

      // 7. Platform Settings
      const { data: settsData } = await supabase
        .from('platform_settings')
        .select('*');

      const localSort = typeof window !== 'undefined' ? (localStorage.getItem('tailoram_homepage_default_sort') as HomepageSortOption) : null;

      if (settsData && settsData.length > 0) {
        const ann = settsData.find((s) => s.key === 'announcement')?.value;
        const maint = settsData.find((s) => s.key === 'maintenance_mode')?.value;
        const wa = settsData.find((s) => s.key === 'whatsapp_enabled')?.value;
        const localWa = typeof window !== 'undefined' ? localStorage.getItem('tailoram_whatsapp_enabled') === 'true' : false;
        const sortSett = settsData.find((s) => s.key === 'homepage_sorting')?.value;
        setPlatformSettings({
          announcement_enabled: ann?.enabled ?? false,
          announcement_message: ann?.message ?? '',
          announcement_type: ann?.type ?? 'info',
          maintenance_mode: maint?.enabled ?? false,
          whatsapp_enabled: wa?.enabled ?? localWa ?? false,
          homepage_default_sort: (sortSett?.default_sort || localSort || 'ranking') as HomepageSortOption,
        });
      } else if (localSort) {
        setPlatformSettings((prev) => ({ ...prev, homepage_default_sort: localSort }));
      }

      // 8. Manual Designer Ratings
      const ratings = await fetchManualRatings();
      setManualRatings(ratings);

      // 9. Email Notification Settings & Logs
      const eSettings = await getEmailSettings();
      setEmailSettings(eSettings);
      const eLogs = getEmailLogs();
      setEmailLogs(eLogs);

      // 10. Platform Commission & Split Payment Settings
      const commSettings = await getCommissionSettings();
      setCommissionSettings(commSettings);

      // 11. Push Notification Broadcasts
      const broadcasts = await getAdminPushBroadcasts();
      setPushBroadcasts(broadcasts);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showNotice('Failed to synchronize some marketplace records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchAllAdminData();
    }
  }, [isUnlocked]);

  // Passkey Login Handle
  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = passkeyInput.trim().toLowerCase();
    // Default passkeys: admin, admin123, tailoram, tailoram2026
    if (
      cleanKey === 'tailoram' ||
      cleanKey === 'tailoram2026' ||
      cleanKey === 'admin' ||
      cleanKey === 'admin123' ||
      cleanKey === 'master'
    ) {
      setIsUnlocked(true);
      sessionStorage.setItem('tailoram_admin_session', 'granted');
      setPasskeyError('');
      showNotice('Admin authorization granted. Welcome to Tailoram Operations.');
    } else {
      setPasskeyError('Invalid master passkey. Try "tailoram" or elevate your user role below.');
    }
  };

  // Self-Role Elevation to Admin
  const handleElevateSelfToAdmin = async () => {
    if (!user) {
      showNotice('Please log in with your account first to grant admin privileges.', 'error');
      return;
    }
    try {
      setIsElevatingRole(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (error) {
        console.warn('DB elevation note:', error.message);
      }

      await refreshProfile();
      setIsUnlocked(true);
      sessionStorage.setItem('tailoram_admin_session', 'granted');
      showNotice(`Successfully granted Administrator privileges to ${profile?.full_name || user.email}!`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to update profile role', 'error');
    } finally {
      setIsElevatingRole(false);
    }
  };

  // --- ACTIONS: DESIGNERS ---
  const handleLoginAsDesigner = async (userId: string, businessName: string) => {
    try {
      showNotice(`Connecting to ${businessName} studio...`, 'info');
      const { error } = await impersonateUser(userId);
      if (error) {
        showNotice(`Could not log in as designer: ${error.message}`, 'error');
        return;
      }
      showNotice(`Successfully authenticated as ${businessName}. Opening Studio Dashboard...`, 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showNotice(err.message || 'Error entering designer studio', 'error');
    }
  };

  const handleToggleVerified = async (designerId: string, currentVal: boolean = false) => {
    const newVal = !currentVal;
    // Optimistic update
    setDesigners((prev) =>
      prev.map((d) => (d.id === designerId ? { ...d, is_verified: newVal } : d))
    );
    try {
      const { error } = await supabase
        .from('designer_profiles')
        .update({ is_verified: newVal })
        .eq('id', designerId);

      if (error) throw error;
      showNotice(`Designer verification status updated to ${newVal ? 'Verified' : 'Unverified'}`);
    } catch (err: any) {
      showNotice(`Could not update verification: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  const handleToggleFeatured = async (designerId: string, currentVal: boolean = false) => {
    const newVal = !currentVal;
    setDesigners((prev) =>
      prev.map((d) => (d.id === designerId ? { ...d, is_featured: newVal } : d))
    );
    try {
      const { error } = await supabase
        .from('designer_profiles')
        .update({ is_featured: newVal })
        .eq('id', designerId);

      if (error) throw error;
      showNotice(`Designer featured status updated to ${newVal ? 'Featured' : 'Standard'}`);
    } catch (err: any) {
      showNotice(`Could not update featured flag: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  const handleToggleStore = async (designerId: string, currentVal: boolean = true) => {
    const newVal = !currentVal;
    setDesigners((prev) =>
      prev.map((d) => (d.id === designerId ? { ...d, has_store: newVal } : d))
    );
    try {
      const { error } = await supabase
        .from('designer_profiles')
        .update({ has_store: newVal })
        .eq('id', designerId);

      if (error) throw error;
      showNotice(`Store feature ${newVal ? 'Enabled' : 'Disabled'} for designer`);
    } catch (err: any) {
      showNotice(`Failed to toggle store: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  const openRatingModal = (designer: DesignerProfile) => {
    const effective = computeEffectiveRating(designer.id, designer.reviews || [], manualRatings);
    setRatingModalDesigner(designer);
    setRatingInput(effective.rating !== null ? effective.rating : 5.0);
    setReviewCountInput(effective.reviewCount || 10);
    setRatingNotesInput(manualRatings[designer.id]?.notes || '');
  };

  const handleSaveRatingOverride = async () => {
    if (!ratingModalDesigner) return;
    try {
      setIsSavingRating(true);
      await saveManualRating(
        ratingModalDesigner.id,
        ratingInput,
        reviewCountInput,
        ratingNotesInput
      );
      const updated = await fetchManualRatings();
      setManualRatings(updated);
      showNotice(`Successfully set ${ratingModalDesigner.business_name} rating to ⭐ ${ratingInput.toFixed(1)} (${reviewCountInput} reviews)`, 'success');
      setRatingModalDesigner(null);
    } catch (err: any) {
      console.error('Error saving manual rating:', err);
      showNotice(err.message || 'Failed to save rating override', 'error');
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleRemoveRatingOverride = async () => {
    if (!ratingModalDesigner) return;
    try {
      setIsSavingRating(true);
      await removeManualRating(ratingModalDesigner.id);
      const updated = await fetchManualRatings();
      setManualRatings(updated);
      showNotice(`Reverted ${ratingModalDesigner.business_name} to natural client reviews`, 'success');
      setRatingModalDesigner(null);
    } catch (err: any) {
      console.error('Error removing rating override:', err);
      showNotice(err.message || 'Failed to remove rating override', 'error');
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleDeleteDesigner = async (designerId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete designer studio "${name}"? This action removes all portfolio items, store products, and studio data.`)) {
      return;
    }
    try {
      // 1. Immediately persist deletion in localStorage
      if (typeof window !== 'undefined') {
        const deletedDesignerIds: string[] = JSON.parse(
          localStorage.getItem('tailoram_deleted_designer_profiles') || '[]'
        );
        if (!deletedDesignerIds.includes(designerId)) {
          deletedDesignerIds.push(designerId);
          localStorage.setItem(
            'tailoram_deleted_designer_profiles',
            JSON.stringify(deletedDesignerIds)
          );
        }
      }

      // 2. Remove optimistically from React state
      setDesigners((prev) => prev.filter((d) => d.id !== designerId));

      // 3. Call security definer RPC
      try {
        await supabase.rpc('admin_delete_designer', { target_designer_id: designerId });
      } catch (rpcErr) {
        console.warn('RPC admin_delete_designer fallback:', rpcErr);
        try {
          await supabase.from('portfolio_items').delete().eq('designer_id', designerId);
          await supabase.from('store_products').delete().eq('designer_id', designerId);
          await supabase.from('reviews').delete().eq('designer_id', designerId);
          await supabase.from('requests').delete().eq('designer_id', designerId);
        } catch {}
        await supabase.from('designer_profiles').delete().eq('id', designerId);
      }

      showNotice(`Designer studio "${name}" successfully deleted.`);
    } catch (err: any) {
      console.error('Failed to delete designer:', err);
      showNotice(`Failed to delete designer: ${err.message}`, 'error');
    }
  };

  // --- ACTIONS: USERS ---
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete user account "${name}"? This removes their profile, requests, and any associated designer data.`)) {
      return;
    }
    try {
      // 1. Immediately persist in localStorage
      if (typeof window !== 'undefined') {
        const deletedUserIds: string[] = JSON.parse(
          localStorage.getItem('tailoram_deleted_user_profiles') || '[]'
        );
        if (!deletedUserIds.includes(userId)) {
          deletedUserIds.push(userId);
          localStorage.setItem(
            'tailoram_deleted_user_profiles',
            JSON.stringify(deletedUserIds)
          );
        }

        // Also check if this user has an associated designer profile
        const matchingDesigner = designers.find((d) => d.user_id === userId);
        if (matchingDesigner) {
          const deletedDesignerIds: string[] = JSON.parse(
            localStorage.getItem('tailoram_deleted_designer_profiles') || '[]'
          );
          if (!deletedDesignerIds.includes(matchingDesigner.id)) {
            deletedDesignerIds.push(matchingDesigner.id);
            localStorage.setItem(
              'tailoram_deleted_designer_profiles',
              JSON.stringify(deletedDesignerIds)
            );
          }
        }
      }

      // 2. Remove optimistically from React state
      setProfilesList((prev) => prev.filter((p) => p.id !== userId));
      setDesigners((prev) => prev.filter((d) => d.user_id !== userId));

      // 3. Call security definer RPC
      try {
        await supabase.rpc('admin_delete_profile', { target_user_id: userId });
      } catch (rpcErr) {
        console.warn('RPC admin_delete_profile fallback:', rpcErr);
        await supabase.from('profiles').delete().eq('id', userId);
      }

      showNotice(`User account "${name}" successfully deleted.`);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showNotice(`Failed to delete user: ${err.message}`, 'error');
    }
  };
  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    setProfilesList((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      showNotice(`User role updated to ${newRole}`);
      if (userId === user?.id) {
        refreshProfile();
      }
    } catch (err: any) {
      showNotice(`Failed to update user role: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  // --- ACTIONS: PASSWORD RESET ---
  const handleAdminResetPassword = async (targetEmail: string, newPass: string) => {
    if (!targetEmail || !newPass) return;
    try {
      setIsResettingPassword(true);
      // 1. Call Supabase RPC to update bcrypt hash in auth.users if function exists
      try {
        await supabase.rpc('admin_reset_user_password', {
          target_email: targetEmail.trim().toLowerCase(),
          new_password: newPass,
        });
      } catch (rpcErr: any) {
        console.warn('RPC password reset note:', rpcErr.message);
      }

      // 2. Persist to platform_settings for instant client authentication
      try {
        const { data: settsRow } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'user_passwords')
          .maybeSingle();

        const currentMap =
          settsRow?.value && typeof settsRow.value === 'object' ? settsRow.value : {};
        const updatedMap = {
          ...currentMap,
          [targetEmail.trim().toLowerCase()]: newPass,
        };

        await supabase.from('platform_settings').upsert({
          key: 'user_passwords',
          value: updatedMap,
        });

        if (typeof window !== 'undefined') {
          const localMap = JSON.parse(localStorage.getItem('tailoram_user_passwords') || '{}');
          localMap[targetEmail.trim().toLowerCase()] = newPass;
          localStorage.setItem('tailoram_user_passwords', JSON.stringify(localMap));
        }
      } catch (storeErr) {
        console.warn('Password persistence note:', storeErr);
      }

      // 3. Also trigger standard recovery email as fallback
      try {
        await supabase.auth.resetPasswordForEmail(targetEmail.trim().toLowerCase());
      } catch {}

      showNotice(`Password for ${targetEmail} reset to "${newPass}".`);
      setResetModalUser(null);
    } catch (err: any) {
      showNotice(`Password reset error: ${err.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResetAllDemoAccounts = async () => {
    try {
      setIsBatchSyncing(true);
      for (const email of ALL_DEMO_EMAILS) {
        try {
          await supabase.rpc('admin_reset_user_password', {
            target_email: email,
            new_password: 'Tailoram2026!',
          });
        } catch (e) {
          // continue
        }
      }

      // Persist all demo accounts to platform_settings
      try {
        const batchMap: Record<string, string> = {};
        ALL_DEMO_EMAILS.forEach((em) => {
          batchMap[em.toLowerCase()] = 'Tailoram2026!';
        });
        await supabase.from('platform_settings').upsert({
          key: 'user_passwords',
          value: batchMap,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('tailoram_user_passwords', JSON.stringify(batchMap));
        }
      } catch (storeErr) {
        console.warn('Batch password persistence note:', storeErr);
      }

      showNotice(`All ${ALL_DEMO_EMAILS.length} demo accounts synchronized to "Tailoram2026!"`);
    } catch (err: any) {
      showNotice(`Batch sync error: ${err.message}`, 'error');
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // --- ACTIONS: REQUESTS OVERRIDE ---
  const handleOverrideRequestStatus = async (
    requestId: string,
    newStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined'
  ) => {
    setRequestsList((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus as any } : r))
    );
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      showNotice(`Order #${requestId.slice(0, 8)} status overridden to ${newStatus}`);
    } catch (err: any) {
      showNotice(`Could not override order status: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  // --- ACTIONS: PRODUCTS ---
  const handleToggleProductStock = async (productId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setProductsList((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, in_stock: newVal } : p))
    );
    try {
      const { error } = await supabase
        .from('store_products')
        .update({ in_stock: newVal })
        .eq('id', productId);

      if (error) throw error;
      showNotice(`Product availability updated to ${newVal ? 'In Stock' : 'Out of Stock'}`);
    } catch (err: any) {
      showNotice(`Failed to update product: ${err.message}`, 'error');
      fetchAllAdminData();
    }
  };

  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!confirm(`Delete product "${title}" from the marketplace?`)) return;
    try {
      const { error } = await supabase.from('store_products').delete().eq('id', productId);
      if (error) throw error;
      setProductsList((prev) => prev.filter((p) => p.id !== productId));
      showNotice(`Product "${title}" removed from shop.`);
    } catch (err: any) {
      showNotice(`Failed to delete product: ${err.message}`, 'error');
    }
  };

  // --- ACTIONS: REVIEWS ---
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Remove this review from the marketplace?')) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;
      setReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
      showNotice('Review deleted successfully.');
    } catch (err: any) {
      showNotice(`Failed to remove review: ${err.message}`, 'error');
    }
  };

  // --- ACTIONS: PLATFORM SETTINGS ---
  const handleSavePlatformSettings = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailoram_whatsapp_enabled', String(platformSettings.whatsapp_enabled));
        localStorage.setItem('tailoram_homepage_default_sort', platformSettings.homepage_default_sort);
      }

      await supabase.from('platform_settings').upsert([
        {
          key: 'announcement',
          value: {
            enabled: platformSettings.announcement_enabled,
            message: platformSettings.announcement_message,
            type: platformSettings.announcement_type,
          },
          updated_at: new Date().toISOString(),
        },
        {
          key: 'maintenance_mode',
          value: {
            enabled: platformSettings.maintenance_mode,
            notice: 'Tailoram is currently undergoing maintenance.',
          },
          updated_at: new Date().toISOString(),
        },
        {
          key: 'whatsapp_enabled',
          value: {
            enabled: platformSettings.whatsapp_enabled,
          },
          updated_at: new Date().toISOString(),
        },
        {
          key: 'homepage_sorting',
          value: {
            default_sort: platformSettings.homepage_default_sort,
          },
          updated_at: new Date().toISOString(),
        },
      ]);
      await saveHomepageDefaultSort(platformSettings.homepage_default_sort);
      await saveEmailSettings(emailSettings);
      await saveCommissionSettings(commissionSettings);
      showNotice('Platform, homepage default sorting, email, and commission settings saved successfully!');
    } catch (err: any) {
      showNotice(`Failed to save settings: ${err.message}`, 'error');
    }
  };

  // --- ACTIONS: EMAIL NOTIFICATIONS ---
  const handleSaveEmailSettings = async () => {
    try {
      setIsSavingEmailSettings(true);
      await saveEmailSettings(emailSettings);
      showNotice('Email notification settings updated and saved globally!');
    } catch (err: any) {
      showNotice(`Failed to save email settings: ${err.message}`, 'error');
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      showNotice('Please enter a destination recipient email address.', 'error');
      return;
    }

    try {
      setIsSendingTestEmail(true);

      const eventLabels: Record<string, { subject: string; preview: string }> = {
        new_request: {
          subject: '🧵 [TEST] New Bespoke Commission Request from Funke Alabi',
          preview: 'Funke Alabi submitted a bespoke tailoring commission for an Emerald Green Silk Agbada. Estimated budget: ₦85,000.',
        },
        quote_received: {
          subject: '📋 [TEST] Studio Price Quote Received: ₦95,000',
          preview: 'Dele Couture Studio submitted an official quote of ₦95,000 (40% deposit: ₦38,000) with completion in 10 days.',
        },
        deposit_paid: {
          subject: '💳 [TEST] 40% Deposit Received (₦38,000) - Production Commenced',
          preview: 'Client Funke Alabi paid the initial 40% commitment deposit of ₦38,000. Payment reference: TLR-TEST-1092.',
        },
        order_ready: {
          subject: '✨ [TEST] Your Bespoke Outfit is Ready for Dispatch!',
          preview: 'Your bespoke garment is completely sewn and quality checked! Please proceed to pay the 60% balance to finalize handover.',
        },
        balance_paid: {
          subject: '🎉 [TEST] 60% Final Balance Settled (₦57,000) - Order Complete',
          preview: 'Client paid the final balance of ₦57,000. The commission is fully paid and ready for immediate delivery.',
        },
        new_message: {
          subject: '💬 [TEST] New Message from Dele Couture on Tailoram',
          preview: 'Dele Couture: "Hello! We have sourced the authentic Aso Oke fabric and started cutting your pattern."',
        },
        welcome: {
          subject: '🌟 [TEST] Welcome to Tailoram Nigeria! Your Account is Live',
          preview: 'Welcome to Nigeria\'s premier bespoke fashion marketplace! Connect with top master tailors across Lagos, Abuja, Port Harcourt, and nationwide.',
        },
      };

      const template = eventLabels[testEmailEvent] || eventLabels.new_request;

      const result = await triggerEmailNotification(
        {
          event: testEmailEvent,
          recipientEmail: testEmailRecipient.trim(),
          recipientName: 'Valued Tailoram Member',
          subject: template.subject,
          previewText: template.preview,
          ctaLink: 'https://tailoram.vercel.app',
          metadata: { is_admin_test: true, provider: emailSettings.provider },
        },
        emailSettings
      );

      // Refresh local logs
      const updatedLogs = getEmailLogs();
      setEmailLogs(updatedLogs);

      if (result.status === 'disabled') {
        showNotice(result.message || 'Notification was not sent because emails or this event are disabled.', 'error');
      } else if (result.status === 'sent') {
        showNotice(`✅ Test email successfully dispatched to ${testEmailRecipient} via ${emailSettings.provider.toUpperCase()}! Please check your Inbox and Spam/Junk folder.`);
      } else if (result.status === 'failed') {
        showNotice(`❌ Delivery Failed: ${result.message || 'Could not send email. Please check your credentials.'}`, 'error');
      } else {
        showNotice(`[Simulated] Notification logged for ${testEmailRecipient}. View in Audit Logs below.`);
      }
    } catch (err: any) {
      showNotice(`Error dispatching test notification: ${err.message}`, 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleClearEmailLogs = () => {
    if (confirm('Are you sure you want to clear all email notification history logs?')) {
      clearEmailLogs();
      setEmailLogs([]);
      showNotice('Email notification logs cleared.');
    }
  };

  // --- PUSH BROADCAST ACTIONS ---
  const handleSendPushBroadcast = async () => {
    if (!broadcastTitle.trim()) {
      showNotice('Please provide a notification title.', 'error');
      return;
    }
    if (!broadcastBody.trim()) {
      showNotice('Please provide a message body.', 'error');
      return;
    }

    try {
      setIsSendingBroadcast(true);
      const res = await sendAdminPushBroadcast({
        title: broadcastTitle,
        body: broadcastBody,
        image: broadcastImageUrl.trim() || undefined,
        url: broadcastLink.trim() || '/shop',
        target_audience: broadcastTarget,
        sent_by: profile?.full_name || user?.email || 'Admin Control Center',
      });

      if (res.success) {
        setPushBroadcasts((prev) => [res.broadcast, ...prev]);
        const targetLabel =
          broadcastTarget === 'all'
            ? 'All Users (Designers & Clients)'
            : broadcastTarget === 'designers'
            ? 'All Master Designers'
            : 'All Clients';
        showNotice(`✅ Broadcast notification successfully sent to ${targetLabel}!`);
      } else {
        showNotice('Failed to broadcast push notification.', 'error');
      }
    } catch (err: any) {
      console.error('Broadcast error:', err);
      showNotice(`Failed to send broadcast: ${err.message}`, 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleTestDevicePush = async () => {
    try {
      setIsTestingLocalPush(true);
      if (!isPushSupported()) {
        showNotice('Web Push is not supported in this browser.', 'error');
        return;
      }

      let perm = getPushPermissionStatus();
      if (perm !== 'granted') {
        perm = await requestPushPermission();
      }

      if (perm !== 'granted') {
        showNotice('Push permission was not granted. Please enable notifications in your browser.', 'error');
        return;
      }

      const delivered = await sendPushNotification({
        title: broadcastTitle.trim() || 'Tailoram Broadcast Test',
        body: broadcastBody.trim() || 'Rich image push notification delivered successfully.',
        image: broadcastImageUrl.trim() || undefined,
        url: broadcastLink.trim() || '/shop',
      });

      if (delivered) {
        showNotice('🚀 Push notification dispatched directly to your device screen!');
      } else {
        showNotice('Push notification triggered. Verify system alert permissions.', 'info');
      }
    } catch (err: any) {
      showNotice(`Error testing push notification: ${err.message}`, 'error');
    } finally {
      setIsTestingLocalPush(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    const ok = await deleteAdminPushBroadcast(broadcastId);
    if (ok) {
      setPushBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId));
      showNotice('Broadcast removed from telemetry log.');
    }
  };


  // --- EXPORT PLATFORM AUDIT REPORT ---
  const handleExportAudit = () => {
    const report = {
      generated_at: new Date().toISOString(),
      platform: 'Tailoram Nigeria',
      totals: {
        designers: designers.length,
        users: profilesList.length,
        requests: requestsList.length,
        products: productsList.length,
        reviews: reviewsList.length,
        events: eventsList.length,
      },
      settings: platformSettings,
      designers_summary: designers.map((d) => ({
        id: d.id,
        business_name: d.business_name,
        state: d.state,
        area: d.area,
        whatsapp: d.whatsapp,
        verified: d.is_verified,
        has_store: d.has_store,
        review_count: d.reviews?.length || 0,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailoram-marketplace-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Audit summary report downloaded successfully.');
  };

  // --- ANALYTICS CALCULATIONS ---
  const analyticsSummary = useMemo(() => {
    // 1. GMV Estimation
    const completedOrdersBudget = requestsList
      .filter((r) => r.status === 'completed' || r.status === 'accepted')
      .reduce((acc, r) => acc + (Number(r.budget_max || r.budget_min) || 0), 0);

    const storeInventoryValue = productsList.reduce((acc, p) => acc + (Number(p.price) || 0), 0);

    const totalGMV = completedOrdersBudget + storeInventoryValue;

    // 2. Average Rating
    const totalRatings = reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avgRating = reviewsList.length > 0 ? (totalRatings / reviewsList.length).toFixed(1) : '5.0';

    // 3. Requests by Status
    const statusCounts = {
      pending: requestsList.filter((r) => r.status === 'pending').length,
      accepted: requestsList.filter((r) => r.status === 'accepted').length,
      in_progress: requestsList.filter((r) => (r.status as any) === 'in_progress').length,
      completed: requestsList.filter((r) => r.status === 'completed').length,
      declined: requestsList.filter((r) => r.status === 'declined').length,
    };

    // 4. Regional Distribution
    const stateCounts: Record<string, number> = {};
    designers.forEach((d) => {
      const st = d.state || 'Lagos';
      stateCounts[st] = (stateCounts[st] || 0) + 1;
    });

    // 5. Gender Focus Distribution
    const genderCounts = {
      male: designers.filter((d) => d.gender_focus === 'male').length,
      female: designers.filter((d) => d.gender_focus === 'female').length,
      unisex: designers.filter((d) => !d.gender_focus || d.gender_focus === 'unisex').length,
    };

    return {
      totalGMV,
      completedOrdersBudget,
      storeInventoryValue,
      avgRating,
      statusCounts,
      stateCounts,
      genderCounts,
      verifiedCount: designers.filter((d) => d.is_verified).length,
      storeEnabledCount: designers.filter((d) => d.has_store).length,
    };
  }, [designers, requestsList, productsList, reviewsList]);

  // Filtering states for tabs
  const [designerSearch, setDesignerSearch] = useState('');
  const [designerFilter, setDesignerFilter] = useState<'all' | 'verified' | 'unverified' | 'store'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'designer' | 'client' | 'admin'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  // Filtered Lists
  const filteredDesigners = useMemo(() => {
    return designers.filter((d) => {
      const matchSearch =
        d.business_name?.toLowerCase().includes(designerSearch.toLowerCase()) ||
        d.state?.toLowerCase().includes(designerSearch.toLowerCase()) ||
        d.area?.toLowerCase().includes(designerSearch.toLowerCase());

      if (!matchSearch) return false;
      if (designerFilter === 'verified') return !!d.is_verified;
      if (designerFilter === 'unverified') return !d.is_verified;
      if (designerFilter === 'store') return !!d.has_store;
      return true;
    });
  }, [designers, designerSearch, designerFilter]);

  const filteredUsers = useMemo(() => {
    return profilesList.filter((p) => {
      const matchSearch =
        p.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(userSearch.toLowerCase());
      if (!matchSearch) return false;
      if (userRoleFilter !== 'all') return p.role === userRoleFilter;
      return true;
    });
  }, [profilesList, userSearch, userRoleFilter]);

  const filteredRequests = useMemo(() => {
    return requestsList.filter((r) => {
      if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
      return true;
    });
  }, [requestsList, requestStatusFilter]);

  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      return (
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.designer?.business_name || '').toLowerCase().includes(productSearch.toLowerCase())
      );
    });
  }, [productsList, productSearch]);

  // ==========================================
  // UNLOCKED GATEWAY / SECURITY SCREEN
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="text-center space-y-2 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 text-stone-950 mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Tailoram Command Center
            </h1>
            <p className="text-xs text-stone-400">
              Master Administrative Governance &amp; Marketplace Telemetry
            </p>
          </div>

          <form onSubmit={handlePasskeySubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                Administrative Passkey
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter master passkey (e.g. tailoram)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder:text-stone-600"
                />
              </div>
              {passkeyError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {passkeyError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          {/* Quick Access bypass for testing */}
          <div className="pt-4 border-t border-stone-800 space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Developer Quick Test:</span>
              <button
                onClick={() => {
                  setPasskeyInput('tailoram');
                  setIsUnlocked(true);
                  sessionStorage.setItem('tailoram_admin_session', 'granted');
                  showNotice('Instant sandbox access granted.');
                }}
                className="text-amber-400 hover:underline font-bold"
              >
                1-Click Unlock (Passkey: tailoram)
              </button>
            </div>

            {user && (
              <button
                onClick={handleElevateSelfToAdmin}
                disabled={isElevatingRole}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 border border-stone-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isElevatingRole ? 'Elevating...' : `Promote My Account (${user.email}) to Admin`}
                </span>
              </button>
            )}

            <div className="text-center">
              <Link href="/" className="text-xs text-stone-500 hover:text-stone-300">
                ← Return to Public Marketplace
              </Link>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN ADMIN CONSOLE
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-20">
      
      {/* Toast Notice */}
      {actionNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all animate-bounce ${
            actionNotice.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : actionNotice.type === 'info'
              ? 'bg-blue-950/90 border-blue-500 text-blue-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          {actionNotice.type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Top Operations Header */}
      <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-xl border-b border-stone-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-tight">
                  Tailoram Command
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                All 36 States Marketplace Network • Real-Time Database Sync
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={fetchAllAdminData}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 flex items-center gap-1.5 transition-colors border border-stone-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleExportAudit}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 flex items-center gap-1.5 transition-colors border border-stone-700"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Audit</span>
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 flex items-center gap-1.5 transition-colors border border-stone-700"
            >
              <Eye className="w-3.5 h-3.5 text-brand-400" />
              <span>View Site</span>
            </Link>

            <button
              onClick={() => {
                sessionStorage.removeItem('tailoram_admin_session');
                setIsUnlocked(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-xs font-bold text-red-300 flex items-center gap-1.5 transition-colors border border-red-800/50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-1 overflow-x-auto pb-1 border-t border-stone-800/60 pt-2 scrollbar-none">
          {[
            { id: 'analytics', label: 'Overview & Analytics', icon: TrendingUp },
            { id: 'designers', label: `Designers (${designers.length})`, icon: Scissors },
            { id: 'users', label: `Users (${profilesList.length})`, icon: Users },
            { id: 'requests', label: `Bespoke Orders (${requestsList.length})`, icon: Package },
            { id: 'products', label: `Shop Catalog (${productsList.length})`, icon: ShoppingBag },
            { id: 'reviews', label: `Reviews (${reviewsList.length})`, icon: Star },
            { id: 'events', label: 'Live Telemetry', icon: Activity },
            { id: 'emails', label: 'Email Settings', icon: Mail },
            { id: 'push', label: `Push Broadcasts (${pushBroadcasts.length})`, icon: BellRing },
            { id: 'settings', label: 'Settings & Alerts', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-amber-400 text-stone-950 shadow-md font-black shadow-amber-400/20'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & REAL-TIME ANALYTICS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
                  <span>ESTIMATED PLATFORM GMV</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  ₦{analyticsSummary.totalGMV.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Bespoke Commissions + Active RTW</span>
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
                  <span>ACTIVE DESIGNER STUDIOS</span>
                  <Scissors className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {designers.length}
                </div>
                <div className="mt-2 text-xs text-stone-400">
                  <span className="text-amber-400 font-bold">{analyticsSummary.verifiedCount} Verified</span> • {analyticsSummary.storeEnabledCount} Stores Online
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
                  <span>BESPOKE ORDERS</span>
                  <Package className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {requestsList.length}
                </div>
                <div className="mt-2 text-xs text-stone-400">
                  <span className="text-emerald-400 font-bold">{analyticsSummary.statusCounts.completed} completed</span> • {analyticsSummary.statusCounts.pending} pending
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
                  <span>SATISFACTION RATING</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
                  <span>{analyticsSummary.avgRating}</span>
                  <span className="text-xs text-stone-400 font-normal">/ 5.0</span>
                </div>
                <div className="mt-2 text-xs text-stone-400">
                  Across {reviewsList.length} verified client reviews
                </div>
              </div>

            </div>

            {/* Breakdowns & Distribution Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Order Pipeline Breakdown */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>Bespoke Order Pipeline</span>
                </h3>
                
                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Pending Review', count: analyticsSummary.statusCounts.pending, color: 'bg-amber-500' },
                    { label: 'Accepted by Tailor', count: analyticsSummary.statusCounts.accepted, color: 'bg-blue-500' },
                    { label: 'In Progress (Sewing)', count: analyticsSummary.statusCounts.in_progress, color: 'bg-purple-500' },
                    { label: 'Completed & Delivered', count: analyticsSummary.statusCounts.completed, color: 'bg-emerald-500' },
                    { label: 'Declined / Cancelled', count: analyticsSummary.statusCounts.declined, color: 'bg-stone-600' },
                  ].map((st, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-stone-300">
                        <span>{st.label}</span>
                        <span>{st.count}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full ${st.color}`}
                          style={{
                            width: `${requestsList.length > 0 ? (st.count / requestsList.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nigerian Fashion Hubs Distribution */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>State Hub Distribution</span>
                </h3>

                <div className="space-y-3 pt-2 max-h-60 overflow-y-auto pr-1">
                  {Object.entries(analyticsSummary.stateCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([state, count], idx) => (
                      <div key={state} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-stone-800 text-stone-400 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-stone-200">{state}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 font-bold">
                          {count} studios
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Audience & Gender Focus */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>Couture Specialization</span>
                </h3>

                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 text-lg">♂</span>
                      <span className="text-xs font-bold text-stone-300">Men&apos;s Couture (Agbada/Senator)</span>
                    </div>
                    <span className="text-sm font-black text-white">{analyticsSummary.genderCounts.male}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400 text-lg">♀</span>
                      <span className="text-xs font-bold text-stone-300">Women&apos;s Wear (Aso Ebi/Bridal)</span>
                    </div>
                    <span className="text-sm font-black text-white">{analyticsSummary.genderCounts.female}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-lg">⚧</span>
                      <span className="text-xs font-bold text-stone-300">Unisex / Mixed Studios</span>
                    </div>
                    <span className="text-sm font-black text-white">{analyticsSummary.genderCounts.unisex}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Recent Telemetry Stream */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Live Telemetry &amp; Interaction Stream</span>
                </h3>
                <span className="text-xs text-stone-400">
                  Last {eventsList.length} platform events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 rounded-l-xl">Event Type</th>
                      <th className="py-2.5 px-4">Metadata / Details</th>
                      <th className="py-2.5 px-4">Designer Ref</th>
                      <th className="py-2.5 px-4 rounded-r-xl">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {eventsList.slice(0, 10).map((ev, i) => (
                      <tr key={ev.id || i} className="hover:bg-stone-800/30">
                        <td className="py-2.5 px-4 font-bold text-amber-400">
                          {ev.event_type}
                        </td>
                        <td className="py-2.5 px-4 text-stone-300 font-mono text-[11px] truncate max-w-xs">
                          {JSON.stringify(ev.metadata || {})}
                        </td>
                        <td className="py-2.5 px-4 text-stone-400">
                          {ev.designer_id ? ev.designer_id.slice(0, 8) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-stone-500 whitespace-nowrap">
                          {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: DESIGNERS & STUDIOS MANAGEMENT */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'designers' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Filter Bar */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                <input
                  type="text"
                  value={designerSearch}
                  onChange={(e) => setDesignerSearch(e.target.value)}
                  placeholder="Search brand, state, or area..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All Studios' },
                  { id: 'verified', label: 'Verified Only' },
                  { id: 'unverified', label: 'Unverified' },
                  { id: 'store', label: 'With RTW Store' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDesignerFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      designerFilter === f.id
                        ? 'bg-amber-400 text-stone-950 font-black'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Designers Table */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Studio / Brand</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Specialty</th>
                      <th className="py-3.5 px-4 text-center">Rating</th>
                      <th className="py-3.5 px-4 text-center">Verified</th>
                      <th className="py-3.5 px-4 text-center">Featured</th>
                      <th className="py-3.5 px-4 text-center">Store</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {filteredDesigners.map((designer) => (
                      <tr key={designer.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">
                            {designer.business_name}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {designer.profiles?.full_name || 'Designer'}
                          </div>
                          {designer.whatsapp && (
                            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{designer.whatsapp}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-stone-200">{designer.area}</div>
                          <div className="text-[11px] text-stone-400">{designer.state}</div>
                          {designer.address && (
                            <div className="text-[10px] text-amber-300/80 truncate max-w-[150px] mt-0.5" title={designer.address}>
                              📍 {designer.address}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 text-[10px] font-bold">
                            {designer.gender_focus ? `${designer.gender_focus.toUpperCase()}` : 'UNISEX'}
                          </span>
                          <div className="text-[10px] text-stone-400 mt-1 truncate max-w-[120px]">
                            {designer.categories?.join(', ')}
                          </div>
                        </td>

                        {/* Rating Display & Override Trigger */}
                        <td className="py-3 px-4 text-center">
                          {(() => {
                            const effective = computeEffectiveRating(designer.id, designer.reviews || [], manualRatings);
                            return (
                              <button
                                onClick={() => openRatingModal(designer)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                  effective.isOverridden
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30'
                                    : 'bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800'
                                }`}
                                title="Click to manually edit studio rating"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="font-black text-white">
                                  {effective.rating !== null ? effective.rating.toFixed(1) : 'New'}
                                </span>
                                {effective.isOverridden && (
                                  <span className="text-[9px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                    Override
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </td>

                        {/* Verified Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleVerified(designer.id, designer.is_verified)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 transition-all ${
                              designer.is_verified
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{designer.is_verified ? 'Verified' : 'Verify'}</span>
                          </button>
                        </td>

                        {/* Featured Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleFeatured(designer.id, designer.is_featured)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 transition-all ${
                              designer.is_featured
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{designer.is_featured ? 'Featured' : 'Pin'}</span>
                          </button>
                        </td>

                        {/* Store Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStore(designer.id, designer.has_store)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 transition-all ${
                              designer.has_store
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                            }`}
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>{designer.has_store ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleLoginAsDesigner(designer.user_id, designer.business_name)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
                              title={`Log into ${designer.business_name} studio to modify images, products & profile`}
                            >
                              <LogIn className="w-3.5 h-3.5 text-stone-950" />
                              <span>Login as Designer</span>
                            </button>

                            <button
                              onClick={() => {
                                setResetModalUser({
                                  id: designer.user_id,
                                  name: designer.business_name,
                                  email: DEMO_EMAILS_MAP[designer.user_id] || '',
                                });
                                setNewPasswordInput('Tailoram2026!');
                              }}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-300 border border-stone-700 hover:border-amber-500/40 transition-colors"
                              title="Reset Studio Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openRatingModal(designer)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-400 border border-stone-700 hover:border-amber-500/40 transition-colors cursor-pointer"
                              title="Manually Set Designer Rating"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400/20 text-amber-400" />
                            </button>

                            <Link
                              href={`/designer/${designer.id}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                              title="View Public Profile"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDeleteDesigner(designer.id, designer.business_name)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400"
                              title="Delete Studio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: USERS & CLIENTS GOVERNANCE */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name or ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetAllDemoAccounts}
                  disabled={isBatchSyncing}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Reset all 10 demo studio and client accounts to Tailoram2026!"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isBatchSyncing ? 'Syncing...' : 'Reset All Demo Passwords'}</span>
                </button>

                {(['all', 'client', 'designer', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      userRoleFilter === role
                        ? 'bg-amber-400 text-stone-950 font-black'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Full Name</th>
                      <th className="py-3.5 px-4">Email / ID</th>
                      <th className="py-3.5 px-4">Current Role</th>
                      <th className="py-3.5 px-4">Joined Date</th>
                      <th className="py-3.5 px-4 text-right">Actions / Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {filteredUsers.map((u) => {
                      const userEmail = DEMO_EMAILS_MAP[u.id] || (u.id === user?.id ? user.email || '' : '');
                      return (
                        <tr key={u.id} className="hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            {u.full_name || 'Anonymous User'}
                          </td>
                          <td className="py-3 px-4 text-stone-400 text-[11px]">
                            {userEmail ? (
                              <span className="font-mono text-amber-300/90">{userEmail}</span>
                            ) : (
                              <span className="font-mono text-stone-500">{u.id.slice(0, 16)}...</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : u.role === 'designer'
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-400 text-[11px]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.role === 'designer' && (
                                <button
                                  onClick={() => handleLoginAsDesigner(u.id, u.full_name)}
                                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1"
                                  title="Log into Studio without password"
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Studio</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setResetModalUser({
                                    id: u.id,
                                    name: u.full_name || 'User',
                                    email: userEmail,
                                  });
                                  setNewPasswordInput('Tailoram2026!');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-300 border border-stone-700 hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1"
                                title="Reset User Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reset Pass</span>
                              </button>

                              <select
                                value={u.role}
                                onChange={(e) => handleChangeUserRole(u.id, e.target.value as UserRole)}
                                className="bg-stone-950 border border-stone-800 rounded-xl px-2 py-1 text-xs text-stone-300 font-bold focus:outline-none focus:border-amber-400"
                              >
                                <option value="client">Client</option>
                                <option value="designer">Designer</option>
                                <option value="admin">Admin</option>
                              </select>

                              <button
                                onClick={() => handleDeleteUser(u.id, u.full_name || 'User')}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/30 transition-colors"
                                title="Delete User Profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: BESPOKE COMMISSION ORDERS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-300 font-bold">
                Total Commission Requests: <span className="text-amber-400 font-black">{requestsList.length}</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {['all', 'pending', 'accepted', 'in_progress', 'completed', 'declined'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      requestStatusFilter === st
                        ? 'bg-amber-400 text-stone-950 font-black'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 hover:border-stone-700 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-stone-500 font-mono">
                        ORDER #{req.id.slice(0, 8)}
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        Client: {req.client?.full_name || 'Anonymous Client'}
                      </h4>
                      <p className="text-xs text-amber-400 font-bold">
                        Studio: {req.designer?.business_name || 'Bespoke Studio'}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        req.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : req.status === 'accepted' || (req.status as any) === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : req.status === 'declined'
                          ? 'bg-stone-800 text-stone-500'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80 leading-relaxed">
                    {req.style_description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-500 font-bold block">BUDGET RANGE</span>
                      <span className="font-bold text-white">
                        ₦{Number(req.budget_min).toLocaleString()}
                        {req.budget_max ? ` - ₦${Number(req.budget_max).toLocaleString()}` : ''}
                      </span>
                    </div>

                    <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-500 font-bold block">FABRIC / DEADLINE</span>
                      <span className="font-bold text-white">
                        {req.fabric || 'Client Fabric'} • {req.deadline || 'Flexible'}
                      </span>
                    </div>
                  </div>

                  {/* Admin Override Buttons */}
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                    <Link
                      href={`/messages/${req.id}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Inspect Chat</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOverrideRequestStatus(req.id, 'completed')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold transition-colors"
                        title="Force Mark Completed"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleOverrideRequestStatus(req.id, 'accepted')}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 text-xs font-bold transition-colors"
                        title="Force Mark Accepted"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleOverrideRequestStatus(req.id, 'declined')}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 text-xs font-bold transition-colors"
                        title="Cancel Order"
                      >
                        Decline
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: RTW SHOP & PRODUCTS CATALOG */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products or designers..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="text-xs text-stone-300 font-bold">
                Total RTW Products: <span className="text-amber-400 font-black">{productsList.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg flex flex-col"
                >
                  <div className="h-44 w-full relative bg-stone-950">
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          p.in_stock
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-red-500/90 text-white'
                        }`}
                      >
                        {p.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        {p.designer?.business_name || 'Bespoke RTW'}
                      </span>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{p.title}</h4>
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2">{p.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                      <span className="text-base font-black text-white">
                        ₦{Number(p.price).toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleProductStock(p.id, p.in_stock)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 transition-colors"
                        >
                          {p.in_stock ? 'Set Sold Out' : 'Set In Stock'}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: REVIEWS MODERATION */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex items-center justify-between">
              <div className="text-xs text-stone-300 font-bold">
                Platform Reviews: <span className="text-amber-400 font-black">{reviewsList.length}</span> submitted
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-700'
                            }`}
                          />
                        ))}
                      </div>
                      <h4 className="font-bold text-white text-xs mt-1">
                        By {resolveReviewClientName(rev)} for{' '}
                        <span className="text-amber-300 font-extrabold">
                          {rev.designer?.business_name || 'Designer'}
                        </span>
                      </h4>
                    </div>

                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-300 italic bg-stone-950/60 p-3 rounded-2xl border border-stone-800">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="text-[10px] text-stone-500">
                    Submitted: {new Date(rev.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 7: LIVE TELEMETRY & EVENTS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'events' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white">
                    Platform Telemetry &amp; Interaction Stream
                  </h3>
                  <p className="text-xs text-stone-400">
                    Live analytics events stored from search queries, studio visits, and commissions
                  </p>
                </div>
                <button
                  onClick={fetchAllAdminData}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-200"
                >
                  Refresh Feed
                </button>
              </div>

              <div className="space-y-2">
                {eventsList.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase">
                        {ev.event_type}
                      </span>
                      <span className="font-mono text-stone-300 text-[11px]">
                        {JSON.stringify(ev.metadata || {})}
                      </span>
                    </div>

                    <div className="text-[10px] text-stone-500">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'Recent'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 8: PLATFORM SETTINGS & GLOBAL ANNOUNCEMENTS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn max-w-3xl">
            
            {/* Global Announcement Banner */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Global Announcement Banner</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Displays a top banner across all pages for national notices, spotlights, or promotions
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.announcement_enabled}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        announcement_enabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-2">
                  Banner Text Message
                </label>
                <textarea
                  rows={2}
                  value={platformSettings.announcement_message}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      announcement_message: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="e.g. ✨ Lagos Fashion Week: Discover top verified Agbada & Owambe designers with nationwide express delivery!"
                />
              </div>

              {/* Preview */}
              {platformSettings.announcement_enabled && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-brand-500/20 to-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{platformSettings.announcement_message}</span>
                </div>
              )}
            </div>

            {/* Homepage Default Sorting Control */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-amber-400" />
                    <span>Homepage Default Designer Sorting</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Controls how designers and master tailors are ranked by default when visitors land on the Tailoram marketplace homepage.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-stone-300">
                    Active: <strong className="text-amber-300 capitalize">{HOMEPAGE_SORT_OPTIONS.find(o => o.id === platformSettings.homepage_default_sort)?.shortLabel || platformSettings.homepage_default_sort}</strong>
                  </span>
                </div>
              </div>

              {/* Interactive Sorting Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {HOMEPAGE_SORT_OPTIONS.map((option) => {
                  const isSelected = platformSettings.homepage_default_sort === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() =>
                        setPlatformSettings({
                          ...platformSettings,
                          homepage_default_sort: option.id,
                        })
                      }
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400/80 ring-1 ring-amber-400/40 shadow-sm'
                          : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-stone-200 group-hover:text-white transition-colors">
                          {option.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {option.badge && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              {option.badge}
                            </span>
                          )}
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400 text-stone-950'
                                : 'border-stone-700 bg-stone-900'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed font-normal">
                        {option.description}
                      </p>

                      <div className="pt-1 flex items-center justify-between border-t border-stone-800/60 text-[10px]">
                        <span className="text-stone-500 font-mono">
                          Value: {option.id}
                        </span>
                        {isSelected ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Default Active
                          </span>
                        ) : (
                          <span className="text-stone-500 group-hover:text-stone-400 transition-colors">
                            Click to select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informative Guidance & 1-Click Quick Apply */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-stone-400 space-y-0.5">
                  <p className="text-[11px]">
                    Visitors can still manually switch filters while browsing, but this determines the initial curated experience for all new visits.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/"
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <span>Preview Live</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveHomepageDefaultSort(platformSettings.homepage_default_sort);
                      await supabase.from('platform_settings').upsert({
                        key: 'homepage_sorting',
                        value: { default_sort: platformSettings.homepage_default_sort },
                        updated_at: new Date().toISOString(),
                      });
                      showNotice(`Homepage default sort updated to "${HOMEPAGE_SORT_OPTIONS.find(o => o.id === platformSettings.homepage_default_sort)?.shortLabel}"!`);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Sort Now</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span>Emergency Maintenance Mode</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Temporarily pause public requests while system upgrades take place
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.maintenance_mode}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        maintenance_mode: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500" />
                </label>
              </div>
            </div>

            {/* Client WhatsApp Chat Control */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Client WhatsApp Chat Option</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Show &quot;Chat on WhatsApp&quot; and &quot;Order on WhatsApp&quot; buttons on studio profiles, marketplace cards, and ready-to-wear product previews.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={platformSettings.whatsapp_enabled}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        whatsapp_enabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800/80 flex items-center justify-between text-xs">
                <span className="text-stone-400">Current Status:</span>
                <span className={`font-bold flex items-center gap-1.5 ${platformSettings.whatsapp_enabled ? 'text-emerald-400' : 'text-stone-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${platformSettings.whatsapp_enabled ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                  {platformSettings.whatsapp_enabled ? 'Active (WhatsApp Buttons Visible)' : 'Hidden (Platform Chat / Request Forms Only)'}
                </span>
              </div>
            </div>

            {/* Demo Accounts & Credentials Recovery */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Demo Accounts &amp; Password Sync</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Synchronize all 10 demo studio &amp; client passwords to <code className="text-amber-300 font-bold">Tailoram2026!</code>
                  </p>
                </div>

                <button
                  onClick={handleResetAllDemoAccounts}
                  disabled={isBatchSyncing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 self-start sm:self-auto"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isBatchSyncing ? 'Syncing...' : 'Sync All Passwords Now'}</span>
                </button>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 text-xs text-stone-300 space-y-1.5 font-mono">
                <div className="flex justify-between text-stone-400 font-sans text-[11px] font-bold">
                  <span>Standard Demo Password:</span>
                  <span className="text-amber-400 font-mono">Tailoram2026!</span>
                </div>
                <p className="text-[11px] text-stone-400 font-sans leading-relaxed">
                  If Supabase returns &quot;Invalid login credentials&quot;, click the button above or run <span className="text-stone-200 font-mono">supabase/add_admin_password_reset.sql</span> in your Supabase SQL editor.
                </p>
              </div>
            </div>

            {/* Platform Commission & Paystack Split Settings Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Platform Commission &amp; Paystack Split Settings</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Configure the platform commission percentage deducted on each transaction (both 40% deposit &amp; 60% balance).
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-stone-300">
                    Non-Custodial Architecture
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Platform Facilitation Fee (%)
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {commissionSettings.commission_percentage}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={commissionSettings.commission_percentage}
                    onChange={(e) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        commission_percentage: Math.max(1, Math.min(50, Number(e.target.value) || 10)),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Applied separately to both deposit and balance. Designers receive {100 - commissionSettings.commission_percentage}% net.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Paystack Processing Fee Absorption
                  </label>
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Platform Absorbs Fees</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      Tailoram absorbs the payment switch processing charge (<code className="text-amber-400 font-mono text-[10px]">bearer: &apos;account&apos;</code>), ensuring artisans receive clean, predictable payouts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Notifications Hub Shortcut */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span>Transactional Email System</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Configure transactional emails, provider API credentials (Resend, SendGrid, SMTP), and inspect live email telemetry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('emails')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Configure Emails &rarr;</span>
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSavePlatformSettings}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Platform Settings</span>
            </button>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: EMAIL NOTIFICATIONS & GATEWAY SETTINGS          */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'emails' && (
          <div className="space-y-6 animate-fadeIn max-w-4xl pb-12">
            
            {/* Header Summary Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-white">
                    Email Notifications &amp; Delivery Gateway
                  </h2>
                </div>
                <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
                  Control real-time transactional emails for bespoke quotes, client deposits, designer progress, and chat alerts. Simulated logging mode is active out-of-the-box; connect Resend or SMTP to deliver live emails directly to user inboxes.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-stone-950 px-4 py-2 rounded-2xl border border-stone-800 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${emailSettings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs font-bold text-stone-300">
                  {emailSettings.enabled ? `Active (${emailSettings.provider.toUpperCase()})` : 'Notifications Disabled'}
                </span>
              </div>
            </div>

            {/* Card 1: Master Controls & Gateway Configuration */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-lg">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Master Notification Switch</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Toggle all automated platform email transmissions globally ON or OFF
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        enabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Delivery Provider / Gateway
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'smtp', label: 'Spaceship Spacemail (SMTP)', desc: 'Direct delivery via mail.spacemail.com' },
                    { id: 'simulated', label: 'Simulated Mode', desc: 'Zero config; logs to audit trail below' },
                    { id: 'resend', label: 'Resend API', desc: 'Recommended for Next.js & Vercel' },
                    { id: 'sendgrid', label: 'SendGrid', desc: 'Twilio SendGrid transactional API' },
                    { id: 'postmark', label: 'Postmark', desc: 'High deliverability transactional' },
                  ].map((prov) => {
                    const isSelected = emailSettings.provider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() =>
                          setEmailSettings({
                            ...emailSettings,
                            provider: prov.id as any,
                            ...(prov.id === 'smtp'
                              ? {
                                  smtp_host: emailSettings.smtp_host || 'mail.spacemail.com',
                                  smtp_port: emailSettings.smtp_port || 465,
                                  smtp_user: emailSettings.smtp_user || emailSettings.sender_email,
                                }
                              : {}),
                          })
                        }
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/80 text-white'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{prov.label}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 leading-snug">{prov.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailSettings.sender_name}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        sender_name: e.target.value,
                      })
                    }
                    placeholder="e.g. Tailoram Nigeria"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Sender Email Address (From)
                  </label>
                  <input
                    type="email"
                    value={emailSettings.sender_email}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        sender_email: e.target.value,
                        ...(emailSettings.provider === 'smtp' && !emailSettings.smtp_user
                          ? { smtp_user: e.target.value }
                          : {}),
                      })
                    }
                    placeholder="e.g. notifications@yourdomain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Credentials Area based on Provider */}
              {emailSettings.provider === 'smtp' ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>🚀 Spaceship Spacemail SMTP Configuration</span>
                      </h4>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Connect your custom domain mailbox hosted on Spaceship Spacemail
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEmailSettings({
                          ...emailSettings,
                          smtp_host: 'mail.spacemail.com',
                          smtp_port: 465,
                          smtp_user: emailSettings.sender_email || emailSettings.smtp_user,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition-colors self-start sm:self-auto"
                    >
                      Fill Spacemail Defaults
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                        SMTP Host Server
                      </label>
                      <input
                        type="text"
                        value={emailSettings.smtp_host || 'mail.spacemail.com'}
                        onChange={(e) =>
                          setEmailSettings({
                            ...emailSettings,
                            smtp_host: e.target.value,
                          })
                        }
                        placeholder="mail.spacemail.com"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                        SMTP Port
                      </label>
                      <select
                        value={emailSettings.smtp_port || 465}
                        onChange={(e) =>
                          setEmailSettings({
                            ...emailSettings,
                            smtp_port: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      >
                        <option value={465}>465 (SSL / Recommended)</option>
                        <option value={587}>587 (TLS / STARTTLS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                        Mailbox Username
                      </label>
                      <input
                        type="email"
                        value={emailSettings.smtp_user || emailSettings.sender_email || ''}
                        onChange={(e) =>
                          setEmailSettings({
                            ...emailSettings,
                            smtp_user: e.target.value,
                          })
                        }
                        placeholder="user@domain.com"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                        Spacemail Mailbox Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showApiKey ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={emailSettings.smtp_pass || emailSettings.api_key || ''}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          smtp_pass: e.target.value,
                          api_key: e.target.value,
                        })
                      }
                      placeholder="Enter your Spacemail mailbox password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  {/* Cheatsheet callout */}
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                    <p className="font-semibold text-stone-300">💡 Quick Spacemail Settings Reference:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-stone-400 font-mono">
                      <li>Outgoing Mail Server: <strong className="text-amber-300">mail.spacemail.com</strong></li>
                      <li>Port: <strong className="text-amber-300">465</strong> (SSL) or <strong className="text-amber-300">587</strong> (STARTTLS)</li>
                      <li>Username: <span className="text-stone-300">Your full Spacemail address</span></li>
                      <li>Password: <span className="text-stone-300">Your Spacemail mailbox password</span></li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Admin Notification Email
                    </label>
                    <input
                      type="email"
                      value={emailSettings.admin_notification_email || ''}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          admin_notification_email: e.target.value,
                        })
                      }
                      placeholder="e.g. admin@tailoram.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                        Provider API Key / Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showApiKey ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={emailSettings.api_key || ''}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          api_key: e.target.value,
                        })
                      }
                      placeholder={
                        emailSettings.provider === 'resend'
                          ? 're_123456789...'
                          : emailSettings.provider === 'sendgrid'
                          ? 'SG.123456789...'
                          : 'Optional in simulated mode'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Granular Notification Event Triggers */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Notification Event Triggers</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Select which marketplace activities trigger automatic email notifications
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    key: 'notify_on_new_request' as const,
                    title: 'New Bespoke Request',
                    recipient: 'Notifies Designer',
                    desc: 'Dispatched when a client commissions a new custom garment with specs & measurements.',
                    icon: Scissors,
                  },
                  {
                    key: 'notify_on_quote_received' as const,
                    title: 'Price Quote Submitted',
                    recipient: 'Notifies Client',
                    desc: 'Dispatched when a designer provides an official price breakdown and delivery timeline.',
                    icon: DollarSign,
                  },
                  {
                    key: 'notify_on_deposit_paid' as const,
                    title: '40% Commitment Deposit Paid',
                    recipient: 'Notifies Designer',
                    desc: 'Dispatched when client completes the 40% initial commitment deposit to begin sewing.',
                    icon: CheckCircle2,
                  },
                  {
                    key: 'notify_on_order_ready' as const,
                    title: 'Garment Ready for Balance',
                    recipient: 'Notifies Client',
                    desc: 'Dispatched when the designer completes tailoring and requests the 60% completion balance.',
                    icon: Sparkles,
                  },
                  {
                    key: 'notify_on_balance_paid' as const,
                    title: '60% Balance Paid / Completed',
                    recipient: 'Notifies Designer',
                    desc: 'Dispatched when client clears final balance. Order is marked complete for dispatch.',
                    icon: Package,
                  },
                  {
                    key: 'notify_on_new_message' as const,
                    title: 'Consultation Chat Messages',
                    recipient: 'Notifies Message Recipient',
                    desc: 'Dispatched when a participant posts a new message in the bespoke order chat thread.',
                    icon: MessageSquare,
                  },
                  {
                    key: 'notify_on_welcome' as const,
                    title: 'Welcome & Onboarding Notification',
                    recipient: 'Notifies New User / Designer',
                    desc: 'Dispatched immediately when a new fashion designer or client joins the Tailoram network.',
                    icon: Sparkles,
                  },
                ].map((evt) => {
                  const Icon = evt.icon;
                  const isChecked = emailSettings[evt.key];
                  return (
                    <div
                      key={evt.key}
                      onClick={() =>
                        setEmailSettings({
                          ...emailSettings,
                          [evt.key]: !isChecked,
                        })
                      }
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'bg-stone-950 border-amber-500/50 hover:border-amber-400'
                          : 'bg-stone-950/60 border-stone-800/80 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${isChecked ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              {evt.recipient}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                            {evt.desc}
                          </p>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-amber-400 mt-1 pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Interactive Test Email Dispatcher */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Send Test Email Notification</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Simulate or dispatch an instant test email to verify your templates, provider delivery, and telemetry logging
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Event Template
                  </label>
                  <select
                    value={testEmailEvent}
                    onChange={(e) => setTestEmailEvent(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="welcome">Welcome Onboarding</option>
                    <option value="new_request">New Bespoke Request</option>
                    <option value="quote_received">Quote Submitted</option>
                    <option value="deposit_paid">40% Deposit Paid</option>
                    <option value="order_ready">Garment Ready for Balance</option>
                    <option value="balance_paid">60% Balance Paid</option>
                    <option value="new_message">Chat Message</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Destination Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="e.g. admin@tailoram.com or your personal email"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-black text-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      {isSendingTestEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isSendingTestEmail ? 'Sending...' : 'Send Test'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Email Telemetry & Sent Logs History */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Sent Notification Telemetry ({emailLogs.length})</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Live audit log of recent notifications dispatched across the platform
                  </p>
                </div>

                {emailLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearEmailLogs}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {emailLogs.length === 0 ? (
                <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800/80 space-y-2">
                  <Mail className="w-8 h-8 text-stone-600 mx-auto" />
                  <p className="text-xs text-stone-400">
                    No email notifications logged in this session yet.
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Submit a quote, commission an outfit, pay a deposit, or click &quot;Send Test&quot; above to view live telemetry.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {emailLogs.map((log) => {
                    const statusColors = {
                      sent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                      simulated: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      disabled: 'bg-stone-700/30 text-stone-400 border-stone-600/30',
                      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
                    };
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white">{log.subject}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                statusColors[log.status] || statusColors.simulated
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono bg-stone-800/60 px-2 py-0.5 rounded-full">
                              {log.event}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                            <span>To: <strong className="text-stone-300 font-mono">{log.recipient_email}</strong></span>
                            {log.recipient_name && <span>({log.recipient_name})</span>}
                          </div>
                          {log.status === 'failed' && log.metadata?.error && (
                            <div className="text-[11px] text-red-400 font-mono bg-red-950/40 px-2.5 py-1 rounded-xl border border-red-900/50 mt-1 flex items-center gap-1.5">
                              <span>⚠️ Error: {log.metadata.error}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-stone-500 whitespace-nowrap self-start sm:self-auto font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveEmailSettings}
              disabled={isSavingEmailSettings}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingEmailSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSavingEmailSettings ? 'Saving Configuration...' : 'Save Email Notification Settings'}</span>
            </button>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: PUSH NOTIFICATION BROADCASTS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'push' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Push Header & Capability Summary */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/30 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    <span>Real-Time Web Push &amp; In-App Broadcasting</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Push Notification Broadcast Center
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Broadcast immediate mobile &amp; desktop push notifications with rich hero image banners across the Tailoram network. Messages deliver via Service Worker push API and persist in user notification feeds.
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <div className="bg-stone-950/80 border border-stone-800 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-4">
                    <span className="text-[11px] text-stone-400 font-medium">Browser Push Status:</span>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      getPushPermissionStatus() === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        getPushPermissionStatus() === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      {getPushPermissionStatus().toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-stone-950/80 border border-stone-800 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-4">
                    <span className="text-[11px] text-stone-400 font-medium">Network Scope:</span>
                    <span className="text-xs font-bold text-stone-200">
                      {profilesList.length} Registered Accounts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Composer & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column: Broadcast Composer (7 cols) */}
              <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-lg space-y-6">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Compose Push Message</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Configure your notification payload, target audience, and rich media
                  </p>
                </div>

                {/* Target Audience Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all' as const, label: 'All Users', sub: `${profilesList.length} accounts`, icon: Globe },
                      { id: 'designers' as const, label: 'Designers', sub: `${designers.length} studios`, icon: Scissors },
                      { id: 'clients' as const, label: 'Clients', sub: `${profilesList.filter(p => p.role === 'client').length} clients`, icon: ShoppingBag },
                    ].map((aud) => {
                      const Icon = aud.icon;
                      const isSelected = broadcastTarget === aud.id;
                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setBroadcastTarget(aud.id)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} />
                            <span className="font-bold text-xs">{aud.label}</span>
                          </div>
                          <span className="text-[10px] text-stone-500 block">{aud.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notification Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Notification Title
                    </label>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {broadcastTitle.length}/65 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. ✨ New Ready-to-Wear Collection Dropped!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>

                {/* Notification Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Message Body
                    </label>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {broadcastBody.length}/240 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="e.g. Explore handcrafted Agbada, Senator sets, and Aso Ebi couture directly from master artisans across Nigeria."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Destination Action Link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Destination Link (Action URL)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['/shop', '/dashboard', '/requests', '/'].map((quickUrl) => (
                        <button
                          key={quickUrl}
                          type="button"
                          onClick={() => setBroadcastLink(quickUrl)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                            broadcastLink === quickUrl
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {quickUrl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={broadcastLink}
                    onChange={(e) => setBroadcastLink(e.target.value)}
                    placeholder="e.g. /shop or https://tailoram.vercel.app/shop"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Banner Image URL & Quick Presets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Banner Image URL (Supports Rich Media)
                    </label>
                    {broadcastImageUrl && (
                      <button
                        type="button"
                        onClick={() => setBroadcastImageUrl('')}
                        className="text-[11px] text-stone-400 hover:text-red-400 transition-colors"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                    <input
                      type="url"
                      value={broadcastImageUrl}
                      onChange={(e) => setBroadcastImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  {/* Curated Nigerian Fashion Presets */}
                  <div>
                    <span className="text-[11px] text-stone-400 font-medium block mb-2">
                      💡 1-Click Nigerian Couture Image Presets:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PUSH_IMAGE_PRESETS.map((preset) => {
                        const isPresetActive = broadcastImageUrl === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setBroadcastImageUrl(preset.url)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all group ${
                              isPresetActive
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-stone-950 border-stone-800/80 hover:border-stone-700'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-stone-800 group-hover:scale-105 transition-transform"
                            />
                            <div className="overflow-hidden">
                              <span className={`text-[11px] font-bold block truncate ${
                                isPresetActive ? 'text-amber-300' : 'text-stone-300 group-hover:text-white'
                              }`}>
                                {preset.name}
                              </span>
                              <span className="text-[9px] text-stone-500 block truncate font-mono">
                                {preset.tag}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dispatch Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestDevicePush}
                    disabled={isTestingLocalPush}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    {isTestingLocalPush ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Test on My Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendPushBroadcast}
                    disabled={isSendingBroadcast}
                    className="w-full flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingBroadcast ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BellRing className="w-4 h-4" />
                    )}
                    <span>
                      {isSendingBroadcast
                        ? 'Broadcasting to Network...'
                        : `Broadcast Push Message to ${
                            broadcastTarget === 'all'
                              ? 'All Users'
                              : broadcastTarget === 'designers'
                              ? 'All Designers'
                              : 'All Clients'
                          }`}
                    </span>
                  </button>
                </div>

              </div>

              {/* Right Column: Live Mockup & Device Simulation (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Simulation 1: Mobile Lockscreen / System Shade */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Live Device Notification Tray</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Mobile &amp; Desktop
                    </span>
                  </div>

                  {/* System Push Mockup Card */}
                  <div className="p-4 rounded-2xl bg-stone-950/90 border border-stone-800 shadow-2xl space-y-3 backdrop-blur-md">
                    
                    {/* Header: App Name & Time */}
                    <div className="flex items-center justify-between text-stone-400 text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                          <Scissors className="w-3 h-3 -rotate-45" />
                        </div>
                        <span className="font-bold text-stone-200 tracking-wider text-[10px] uppercase">
                          TAILORAM NIGERIA
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500">now</span>
                    </div>

                    {/* Title & Body */}
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-white leading-snug">
                        {broadcastTitle || 'Notification Title'}
                      </p>
                      <p className="text-[11px] text-stone-300 leading-relaxed">
                        {broadcastBody || 'Notification message content will be displayed here.'}
                      </p>
                    </div>

                    {/* Rendered Hero Image */}
                    {broadcastImageUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-stone-800 shadow-inner group">
                        <img
                          src={broadcastImageUrl}
                          alt="Notification Hero Banner"
                          className="w-full h-36 object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-md text-[9px] font-bold text-amber-300 border border-stone-800">
                          Rich Hero Media
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-stone-800 text-center text-[11px] text-stone-500">
                        No image attached. Tap a preset above to include a high-res photo banner.
                      </div>
                    )}

                    {/* Tap action indicator */}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-800/80">
                      <span>Action Target: <code className="text-amber-400 font-mono">{broadcastLink || '/shop'}</code></span>
                      <ExternalLink className="w-3 h-3 text-stone-500" />
                    </div>

                  </div>
                </div>

                {/* Simulation 2: In-App Lightbox Popover Preview */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-purple-400" />
                      <span>Studio &amp; Client In-App Feed Card</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      In-App Modal
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-950 border border-purple-900/30 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
                        Official Broadcast
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">Just now</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-xs text-white">{broadcastTitle || 'Title'}</h4>
                      <p className="text-[11px] text-stone-300 line-clamp-2">{broadcastBody || 'Message'}</p>
                    </div>

                    {broadcastImageUrl && (
                      <img
                        src={broadcastImageUrl}
                        alt="Preview"
                        className="w-full h-24 object-cover rounded-xl border border-stone-800"
                      />
                    )}

                    <div className="pt-1 flex items-center justify-end">
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <span>Open Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Past Push Broadcasts Telemetry History */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Broadcast Telemetry Log ({pushBroadcasts.length})</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    History of push announcements dispatched to Tailoram users
                  </p>
                </div>

                {pushBroadcasts.length > 0 && (
                  <span className="text-xs font-mono text-stone-400">
                    Showing latest broadcasts
                  </span>
                )}
              </div>

              {pushBroadcasts.length === 0 ? (
                <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800/80 space-y-2">
                  <BellRing className="w-8 h-8 text-stone-600 mx-auto" />
                  <p className="text-xs text-stone-400">
                    No push broadcasts recorded yet.
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Compose a broadcast above and click &quot;Broadcast Push Message&quot; to reach your users instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {pushBroadcasts.map((bc) => (
                    <div
                      key={bc.id}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-stone-700"
                    >
                      <div className="flex items-start gap-4">
                        {bc.image ? (
                          <img
                            src={bc.image}
                            alt={bc.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-800 shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 shrink-0">
                            <BellRing className="w-6 h-6" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{bc.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              bc.target_audience === 'all'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : bc.target_audience === 'designers'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {bc.target_audience === 'all' ? 'All Users' : bc.target_audience === 'designers' ? 'Designers Only' : 'Clients Only'}
                            </span>
                            {bc.url && (
                              <span className="text-[10px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                                {bc.url}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                            {bc.body}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-0.5">
                            <span>Dispatched by <strong className="text-stone-400">{bc.sent_by || 'Admin'}</strong></span>
                            <span>•</span>
                            <span className="font-mono">
                              {new Date(bc.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await sendPushNotification({
                              title: bc.title,
                              body: bc.body,
                              image: bc.image,
                              url: bc.url,
                            });
                            showNotice('Test notification dispatched to your device!');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-700"
                          title="Test on this device"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                          <span>Re-Test</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(bc.id)}
                          className="p-2 rounded-xl bg-stone-900 hover:bg-red-950/60 text-stone-400 hover:text-red-300 transition-colors border border-stone-800 hover:border-red-800/40"
                          title="Delete from broadcast log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}


      </main>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">
                Admin Password Reset
              </h3>
              <p className="text-xs text-stone-400">
                Instantly update login credentials for <strong className="text-amber-300">{resetModalUser.name}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Target Account Email
                </label>
                <input
                  type="email"
                  value={resetModalUser.email}
                  onChange={(e) => setResetModalUser({ ...resetModalUser, email: e.target.value })}
                  placeholder="e.g. dele.couture@demo.tailoram.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('Tailoram2026!')}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    Default: Tailoram2026!
                  </button>
                </div>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingPassword || !resetModalUser.email}
                onClick={() => handleAdminResetPassword(resetModalUser.email, newPasswordInput)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isResettingPassword ? 'Resetting Password...' : 'Apply Password Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Designer Rating Override Modal */}
      {ratingModalDesigner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => !isSavingRating && setRatingModalDesigner(null)}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    Set Studio Rating
                  </h3>
                  <p className="text-xs text-stone-400 truncate max-w-[240px]">
                    {ratingModalDesigner.business_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRatingModalDesigner(null)}
                disabled={isSavingRating}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Natural Status */}
            {(() => {
              const naturalRevs = ratingModalDesigner.reviews || [];
              const naturalCount = naturalRevs.length;
              const naturalAvg = naturalCount > 0
                ? (naturalRevs.reduce((sum, r) => sum + (r.rating || 0), 0) / naturalCount).toFixed(1)
                : 'None';
              const currentEffective = computeEffectiveRating(ratingModalDesigner.id, naturalRevs, manualRatings);

              return (
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Natural Client Average:</span>
                    <span className="font-bold text-stone-200">
                      {naturalAvg === 'None' ? 'No client reviews yet' : `⭐ ${naturalAvg} (${naturalCount} reviews)`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Current Display Status:</span>
                    <span className="font-black text-amber-400">
                      {currentEffective.rating !== null ? `⭐ ${currentEffective.rating.toFixed(1)} (${currentEffective.reviewCount} reviews)` : 'New Studio'}
                      {currentEffective.isOverridden && ' (Manual Override Active)'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Quick Preset Buttons */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Quick Star Rating Presets
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5.0, 4.9, 4.8, 4.7, 4.5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRatingInput(preset)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      ratingInput === preset
                        ? 'bg-amber-400 text-stone-950 shadow-md shadow-amber-400/20'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    <span>{preset.toFixed(1)}</span>
                    <span className="text-[10px]">★★★★★</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Rating Value & Review Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Rating Value (1.0 – 5.0)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={ratingInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setRatingInput(val);
                    }}
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-black text-sm focus:outline-none focus:border-amber-400"
                  />
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Review Count Badge
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={reviewCountInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setReviewCountInput(val);
                  }}
                  placeholder="e.g. 15"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-black text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Internal Admin Note */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Admin Note / Audit Reason (Optional)
              </label>
              <input
                type="text"
                value={ratingNotesInput}
                onChange={(e) => setRatingNotesInput(e.target.value)}
                placeholder="e.g. Verified Master Designer quality inspection score"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={handleSaveRatingOverride}
                disabled={isSavingRating}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingRating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Applying Rating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save Rating (⭐ {ratingInput.toFixed(1)})</span>
                  </>
                )}
              </button>

              {manualRatings[ratingModalDesigner.id] && (
                <button
                  type="button"
                  onClick={handleRemoveRatingOverride}
                  disabled={isSavingRating}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-red-950/40 text-stone-400 hover:text-red-400 border border-stone-700 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  Reset to Natural Client Reviews
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
