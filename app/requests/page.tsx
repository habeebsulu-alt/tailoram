'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OutfitRequest, Review, WalletTransaction } from '@/lib/types';
import {
  getLocalRequestOverrides,
  fetchCloudRequestOverrides,
  getLocalCreatedRequests,
  fetchCloudCreatedRequests,
  calculatePaymentBreakdown,
  respondToQuote,
  PaymentResult,
} from '@/lib/payments';
import { getWhatsAppDispatchUrl } from '@/lib/whatsappNotifications';
import { getClientWalletTransactions } from '@/lib/paystack';
import PaymentModal from '@/components/PaymentModal';
import OrderReviewModal from '@/components/OrderReviewModal';
import MeasurementsModal from '@/components/MeasurementsModal';
import {
  Scissors,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  MapPin,
  Calendar,
  Send,
  Loader2,
  ChevronRight,
  Sparkles,
  CreditCard,
  Check,
  Package,
  Ruler,
  Receipt,
  ExternalLink,
  ShieldCheck,
  BellRing,
  X,
} from 'lucide-react';
import { getAdminPushBroadcasts, AdminPushBroadcast } from '@/lib/pushNotifications';

export default function ClientRequestsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<OutfitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab mode & transactions state
  const [activeView, setActiveView] = useState<'requests' | 'payments'>('requests');
  const [clientTransactions, setClientTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<OutfitRequest | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetReviewRequest, setTargetReviewRequest] = useState<OutfitRequest | null>(null);
  const [reviewedRequestIds, setReviewedRequestIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [measurementsModalOpen, setMeasurementsModalOpen] = useState(false);
  const [selectedMeasurementsRequest, setSelectedMeasurementsRequest] = useState<OutfitRequest | null>(null);

  // Push Broadcasts state for clients
  const [clientBroadcasts, setClientBroadcasts] = useState<AdminPushBroadcast[]>([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<string[]>([]);

  const handleDismissBroadcast = (id: string) => {
    const updated = [...dismissedBroadcastIds, id];
    setDismissedBroadcastIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tailoram_client_dismissed_broadcasts', JSON.stringify(updated));
    }
  };

  const fetchTransactions = async (clientId: string) => {
    try {
      setLoadingTransactions(true);
      const txns = await getClientWalletTransactions(clientId);
      setClientTransactions(txns);
    } catch (err) {
      console.warn('Failed to load client payment history:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchRequests = async (clientId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*, designer:designer_id(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load requests from Supabase:', error.message);
      }

      const cloudOverrides = await fetchCloudRequestOverrides();
      const overrides = { ...getLocalRequestOverrides(), ...cloudOverrides };
      const rawList = (data as OutfitRequest[]) || [];

      // Include locally & cloud created requests for this client
      const cloudCreatedList = await fetchCloudCreatedRequests();
      const localCreatedList = getLocalCreatedRequests();
      const allCreated = [...cloudCreatedList, ...localCreatedList];
      const clientCreated = allCreated.filter((r) => r.client_id === clientId);
      const existingIds = new Set(rawList.map((r) => r.id));
      const combined = [...rawList, ...clientCreated.filter((r) => !existingIds.has(r.id))];

      // Merge with overrides for multi-device sync
      const mergedList = combined.map((req) => {
        const local = overrides[req.id] || {};
        return { ...req, ...local };
      });

      setRequests(mergedList);

      // Check which requests already have reviews
      const reviewedIds: string[] = [];
      if (typeof window !== 'undefined') {
        mergedList.forEach((r) => {
          if (localStorage.getItem(`tailoram_request_review_${r.id}_${clientId}`)) {
            reviewedIds.push(r.id);
          }
        });
      }

      try {
        const { data: revData } = await supabase
          .from('reviews')
          .select('request_id')
          .eq('client_id', clientId);

        if (revData) {
          revData.forEach((r) => {
            if (r.request_id && !reviewedIds.includes(r.request_id)) {
              reviewedIds.push(r.request_id);
            }
          });
        }
      } catch (err) {}

      setReviewedRequestIds(reviewedIds);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/requests');
      } else {
        fetchRequests(user.id);
        fetchTransactions(user.id);
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadBroadcasts() {
      try {
        const broadcasts = await getAdminPushBroadcasts();
        const relevant = broadcasts.filter(
          (b) => b.target_audience === 'all' || b.target_audience === 'clients'
        );
        setClientBroadcasts(relevant);
        if (typeof window !== 'undefined') {
          const dismissed = JSON.parse(
            localStorage.getItem('tailoram_client_dismissed_broadcasts') || '[]'
          );
          setDismissedBroadcastIds(dismissed);
        }
      } catch (err) {
        console.warn('Could not load client push broadcasts:', err);
      }
    }
    loadBroadcasts();
  }, []);

  const handleOpenPayment = (req: OutfitRequest, type: 'deposit' | 'balance') => {
    setSelectedPaymentRequest(req);
    setPaymentType(type);
    setPaymentModalOpen(true);
  };

  const handleAcceptQuoteAndPay = async (req: OutfitRequest) => {
    if (!user) return;
    try {
      setActionLoadingId(req.id);
      await respondToQuote({
        requestId: req.id,
        clientUserId: user.id,
        accept: true,
      });

      // Update state
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'accepted' } : r))
      );

      // Open deposit modal immediately
      setSelectedPaymentRequest({ ...req, status: 'accepted' });
      setPaymentType('deposit');
      setPaymentModalOpen(true);
    } catch (err) {
      console.error('Failed to accept quote:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineQuote = async (req: OutfitRequest) => {
    if (!user) return;
    if (!confirm('Are you sure you want to decline this quote?')) return;
    try {
      setActionLoadingId(req.id);
      await respondToQuote({
        requestId: req.id,
        clientUserId: user.id,
        accept: false,
      });

      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'declined' } : r))
      );
    } catch (err) {
      console.error('Failed to decline quote:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReview = (req: OutfitRequest) => {
    setTargetReviewRequest(req);
    setReviewModalOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
              Client Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight pt-1">
              My Orders &amp; Payments
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              Track custom bespoke commissions, Paystack deposits (40%), and completion balances (60%).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveView('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'requests'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Custom Orders ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'payments'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-brand-600" />
              <span>Payment History ({clientTransactions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Announcements for Clients */}
      {clientBroadcasts.filter((bc) => !dismissedBroadcastIds.includes(bc.id)).length > 0 && (
        <div className="space-y-4">
          {clientBroadcasts
            .filter((bc) => !dismissedBroadcastIds.includes(bc.id))
            .slice(0, 2)
            .map((bc) => (
              <div
                key={bc.id}
                className="bg-stone-950 text-white rounded-3xl border border-stone-800 shadow-xl overflow-hidden relative"
              >
                {bc.image && (
                  <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-stone-900">
                    <img
                      src={bc.image}
                      alt={bc.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                  </div>
                )}
                <div className="p-5 sm:p-6 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                        Tailoram Announcement
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismissBroadcast(bc.id)}
                      className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                      title="Dismiss announcement"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">{bc.title}</h3>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">{bc.body}</p>
                  </div>

                  {bc.url && (
                    <div className="pt-1">
                      <Link
                        href={bc.url}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md"
                      >
                        <span>Explore Now</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* VIEW 1: REQUESTS LIST */}
      {activeView === 'requests' && (
        <>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Scissors className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              No custom requests sent yet
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-sm mx-auto">
              Find talented Nigerian tailors in your neighborhood and send your first style request.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
          >
            Browse Designers &amp; Tailors
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const hasReviewed = reviewedRequestIds.includes(req.id);
            const breakdown = calculatePaymentBreakdown(req.quoted_price || req.budget_min);
            const isProcessingThis = actionLoadingId === req.id;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
                      Sent {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-stone-900 text-base sm:text-lg">
                      {req.designer?.business_name || 'Designer Profile'}
                    </h3>
                    <p className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      {req.designer?.area || 'Lagos'}, {req.designer?.state || 'Nigeria'}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 line-clamp-2 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {req.style_description}
                  </p>

                  {/* QUOTE CALLOUT CARD */}
                  {req.status === 'quoted' && req.quoted_price && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-stone-800 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between font-black text-amber-900">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Official Quote Received: ₦{req.quoted_price.toLocaleString()}
                        </span>
                        {req.quote_deadline && (
                          <span className="text-[11px] font-bold text-amber-800">
                            Est. {new Date(req.quote_deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-stone-600 text-[11px]">
                        Deposit to begin (40%): <strong>₦{(req.deposit_amount || breakdown.depositAmount).toLocaleString()}</strong> • Balance upon completion (60%): <strong>₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()}</strong>
                      </p>
                    </div>
                  )}

                  {/* READY FOR BALANCE CALLOUT */}
                  {req.status === 'ready_for_balance' && (
                    <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1 animate-fadeIn">
                      <div className="flex items-center justify-between font-black">
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-purple-600" />
                          Tailoring Complete! Balance Due
                        </span>
                        <span>₦{(req.balance_amount || breakdown.balanceAmount).toLocaleString()}</span>
                      </div>
                      <p className="text-purple-700 text-[11px]">
                        Your outfit is finished. Settle the 60% balance to finalize your commission and arrange delivery.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 pt-1 font-medium">
                    <span>
                      {req.quoted_price ? (
                        <>Quoted Price: <strong className="text-stone-900 font-bold">₦{req.quoted_price.toLocaleString()}</strong></>
                      ) : (
                        <>Budget: <strong className="text-stone-900 font-bold">₦{req.budget_min.toLocaleString()}{req.budget_max ? ` - ₦${req.budget_max.toLocaleString()}` : ''}</strong></>
                      )}
                    </span>
                    {req.fabric && (
                      <span>Fabric: <strong className="text-stone-900">{req.fabric}</strong></span>
                    )}
                    {req.deadline && (
                      <span>Needed: <strong className="text-stone-900">{new Date(req.deadline).toLocaleDateString()}</strong></span>
                    )}
                    {req.measurements && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeasurementsRequest(req);
                          setMeasurementsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Ruler className="w-3.5 h-3.5 text-amber-700" />
                        <span>My Measurements</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col items-stretch gap-2 flex-shrink-0 min-w-[170px]">
                  
                  {/* Quoted: Accept & Pay Deposit */}
                  {req.status === 'quoted' && (
                    <>
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleAcceptQuoteAndPay(req)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Accept &amp; Pay Deposit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleDeclineQuote(req)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Decline Quote</span>
                      </button>
                    </>
                  )}

                  {/* Accepted: Pay Deposit */}
                  {req.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(req, 'deposit')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pay 40% Deposit</span>
                    </button>
                  )}

                  {/* Ready for Balance: Pay Remaining 60% */}
                  {req.status === 'ready_for_balance' && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(req, 'balance')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-purple-200" />
                      <span>Pay 60% Balance</span>
                    </button>
                  )}

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/messages/${req.id}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                      <span>Chat Consultation</span>
                    </Link>

                    {/* 1-Click WhatsApp Designer */}
                    {(() => {
                      const designerPhone = req.designer?.whatsapp;
                      const waUrl = getWhatsAppDispatchUrl({
                        event: 'chat_followup',
                        recipientPhone: designerPhone,
                        recipientName: req.designer?.business_name || 'Master Designer',
                        senderName: user?.email ? 'Your Client' : 'Client',
                        styleDescription: req.style_description,
                        requestId: req.id,
                      });

                      return (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs"
                          title="Message designer on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-emerald-200 text-emerald-200" />
                          <span>WhatsApp Studio</span>
                        </a>
                      );
                    })()}
                  </div>

                  {/* Completed: Rate Designer */}
                  {req.status === 'completed' && !hasReviewed && (
                    <button
                      onClick={() => handleOpenReview(req)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-stone-950" />
                      <span>Rate Designer</span>
                    </button>
                  )}

                  {hasReviewed && req.status === 'completed' && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review Published
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* VIEW 2: CLIENT PAYMENT HISTORY */}
      {activeView === 'payments' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-brand-600" />
                  <span>Verified Payment Receipts</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Secure record of all 40% commitment deposits and 60% completion balances paid via Paystack.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 self-start sm:self-auto">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Protected by Paystack Escrow Split</span>
              </div>
            </div>

            {loadingTransactions ? (
              <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                <p className="text-xs font-semibold">Loading payment receipts...</p>
              </div>
            ) : clientTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Receipt className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm">No payment records found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  When you accept a designer&apos;s quote and pay the initial 40% deposit or final balance, your official payment receipts will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3.5 px-4 sm:px-6">Date &amp; Outfit Description</th>
                      <th className="py-3.5 px-4">Stage</th>
                      <th className="py-3.5 px-4">Amount Paid</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {clientTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <div className="space-y-0.5">
                            <p className="font-bold text-stone-900 truncate max-w-xs">
                              {txn.style_description || 'Custom Bespoke Outfit'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400">
                              <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="font-mono">{txn.paystack_reference}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              txn.payment_stage === 'deposit'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {txn.payment_stage === 'deposit' ? '40% Deposit' : '60% Balance'}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap font-black text-stone-900 text-sm">
                          ₦{Number(txn.gross_amount).toLocaleString()}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Payment Verified</span>
                          </span>
                        </td>

                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                          <a
                            href={txn.receipt_url || `https://checkout.paystack.com/receipt/${txn.paystack_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3 text-stone-400" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPaymentRequest && user && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          request={selectedPaymentRequest}
          type={paymentType}
          customerEmail={user.email || 'client@tailoram.com'}
          customerName={profile?.full_name || 'Client'}
          onPaymentSuccess={(result: PaymentResult) => {
            if (user) fetchRequests(user.id);
          }}
        />
      )}

      {/* Order Review Modal */}
      {targetReviewRequest && user && (
        <OrderReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          request={targetReviewRequest}
          reviewerId={user.id}
          reviewerName={profile?.full_name || user.user_metadata?.full_name || 'Client'}
          revieweeId={targetReviewRequest.designer_id}
          revieweeName={targetReviewRequest.designer?.business_name || 'Designer'}
          isClientReviewingDesigner={true}
          onReviewSubmitted={() => {
            if (user) fetchRequests(user.id);
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
          clientName={profile?.full_name || 'My Sizing'}
          orderNumber={selectedMeasurementsRequest.id.slice(0, 8)}
        />
      )}

    </div>
  );
}
