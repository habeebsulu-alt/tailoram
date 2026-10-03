'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OutfitRequest, Review } from '@/lib/types';
import {
  getLocalRequestOverrides,
  getLocalCreatedRequests,
  calculatePaymentBreakdown,
  respondToQuote,
  PaymentResult,
} from '@/lib/payments';
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
} from 'lucide-react';

export default function ClientRequestsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<OutfitRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

      const overrides = getLocalRequestOverrides();
      const rawList = (data as OutfitRequest[]) || [];

      // Include locally created requests for this client
      const localCreated = getLocalCreatedRequests().filter((r) => r.client_id === clientId);
      const existingIds = new Set(rawList.map((r) => r.id));
      const combined = [...rawList, ...localCreated.filter((r) => !existingIds.has(r.id))];

      // Merge with local overrides for demo resilience
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
      }
    }
  }, [user, authLoading, router]);

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
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
            Order Activity
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight pt-2">
            My Custom Outfit Requests
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Track quotes, pay 40% commitment deposits, oversee production, and settle final 60% balances.
          </p>
        </div>
      </div>

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
                      {req.designer?.business_name || 'Designer Atelier'}
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

                  <Link
                    href={`/messages/${req.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                    <span>Chat Consultation</span>
                  </Link>

                  {/* Completed: Rate Atelier */}
                  {req.status === 'completed' && !hasReviewed && (
                    <button
                      onClick={() => handleOpenReview(req)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-stone-950" />
                      <span>Rate Atelier</span>
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
          revieweeId={targetReviewRequest.designer_id}
          revieweeName={targetReviewRequest.designer?.business_name || 'Atelier'}
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
