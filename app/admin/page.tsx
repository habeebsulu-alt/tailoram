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
} from 'lucide-react';

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

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'designers' | 'users' | 'requests' | 'products' | 'reviews' | 'events' | 'settings'
  >('analytics');

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
  }>({
    announcement_enabled: true,
    announcement_message: "✨ Welcome to Tailoram: Nigeria's premier bespoke couture network. Explore top studios across all 36 states!",
    announcement_type: 'info',
    maintenance_mode: false,
    whatsapp_enabled: false,
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
        setRequestsList(rData as OutfitRequest[]);
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

      if (!revErr && revData) {
        setReviewsList(revData as Review[]);
      }

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

      if (settsData && settsData.length > 0) {
        const ann = settsData.find((s) => s.key === 'announcement')?.value;
        const maint = settsData.find((s) => s.key === 'maintenance_mode')?.value;
        const wa = settsData.find((s) => s.key === 'whatsapp_enabled')?.value;
        const localWa = typeof window !== 'undefined' ? localStorage.getItem('tailoram_whatsapp_enabled') === 'true' : false;
        setPlatformSettings({
          announcement_enabled: ann?.enabled ?? false,
          announcement_message: ann?.message ?? '',
          announcement_type: ann?.type ?? 'info',
          maintenance_mode: maint?.enabled ?? false,
          whatsapp_enabled: wa?.enabled ?? localWa ?? false,
        });
      }
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
    if (!confirm(`Are you sure you want to permanently delete user account "${name}"? This removes their profile, requests, and any associated atelier data.`)) {
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
      ]);
      showNotice('Platform settings saved and propagated successfully!');
    } catch (err: any) {
      showNotice(`Failed to save settings: ${err.message}`, 'error');
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
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 text-[10px] font-bold">
                            {designer.gender_focus ? `${designer.gender_focus.toUpperCase()}` : 'UNISEX'}
                          </span>
                          <div className="text-[10px] text-stone-400 mt-1 truncate max-w-[120px]">
                            {designer.categories?.join(', ')}
                          </div>
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
                        By {rev.client?.full_name || 'Client'} for{' '}
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

    </div>
  );
}
