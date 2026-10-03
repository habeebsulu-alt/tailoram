'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OutfitRequest, Message, DesignerProfile, Profile } from '@/lib/types';
import {
  respondToQuote,
  markOrderReadyForBalance,
  getLocalRequestOverrides,
  getLocalCreatedRequests,
  calculatePaymentBreakdown,
  PaymentResult,
  DEPOSIT_PERCENTAGE,
  BALANCE_PERCENTAGE,
} from '@/lib/payments';
import PaymentModal from '@/components/PaymentModal';
import QuoteModal from '@/components/QuoteModal';
import OrderReviewModal from '@/components/OrderReviewModal';
import MeasurementsModal from '@/components/MeasurementsModal';
import {
  ArrowLeft,
  Send,
  Loader2,
  Scissors,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  MessageSquare,
  Sparkles,
  CreditCard,
  FileText,
  Check,
  ChevronRight,
  ShieldCheck,
  Package,
  Ruler,
} from 'lucide-react';

export default function MessageChatPage() {
  const params = useParams();
  const requestId = params?.requestId as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [request, setRequest] = useState<OutfitRequest | null>(null);
  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Workflow modals & action states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [measurementsModalOpen, setMeasurementsModalOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check review status
  const checkReviewStatus = async (reqId: string, currentUserId: string) => {
    if (typeof window !== 'undefined') {
      const localRevKey = `tailoram_request_review_${reqId}_${currentUserId}`;
      if (localStorage.getItem(localRevKey)) {
        setHasReviewed(true);
        return;
      }
    }

    try {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('request_id', reqId);

      if (data && data.length > 0) {
        setHasReviewed(true);
      }
    } catch {}
  };

  // Load request and verify participant
  const loadRequestAndMessages = async () => {
    if (!requestId || !user) return;

    try {
      setLoading(true);

      // 1. Fetch request details
      const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqError) {
        console.warn('Could not fetch request from Supabase:', reqError.message);
      }

      const overrides = getLocalRequestOverrides();
      const localOverride = overrides[requestId] || {};
      const localCreated = getLocalCreatedRequests().find((r) => r.id === requestId);
      const baseReq = reqData || localCreated;
      const mergedReq = baseReq
        ? ({ ...baseReq, ...localOverride } as OutfitRequest)
        : null;

      if (mergedReq) {
        setRequest(mergedReq);
      }

      // 2. Fetch designer profile
      const designerId = mergedReq?.designer_id || reqData?.designer_id;
      if (designerId) {
        const { data: dData } = await supabase
          .from('designer_profiles')
          .select('*, profiles:user_id(full_name)')
          .eq('id', designerId)
          .single();
        if (dData) setDesigner(dData as DesignerProfile);
      }

      // 3. Fetch client profile
      const clientId = mergedReq?.client_id || reqData?.client_id;
      if (clientId) {
        const { data: cData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single();
        if (cData) setClientProfile(cData as Profile);
      }

      // Check review status
      await checkReviewStatus(requestId, user.id);

      // 4. Fetch initial messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name, role)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (!msgError && msgData) {
        setMessages(msgData as Message[]);
      }
    } catch (err) {
      console.error('Error loading chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?redirect=/messages/${requestId}`);
      } else {
        loadRequestAndMessages();
      }
    }
  }, [requestId, user, authLoading, router]);

  // Subscribe to realtime messages & request updates
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`request-chat-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          if (senderData) {
            newMsg.sender = senderData as Profile;
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const updated = payload.new as OutfitRequest;
          setRequest((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !requestId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            request_id: requestId,
            sender_id: user.id,
            content: messageText,
          },
        ])
        .select('*, sender:sender_id(full_name, role)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert('Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Client accepts or declines quote
  const handleQuoteResponse = async (accept: boolean) => {
    if (!user || !request) return;
    try {
      setActionLoading(true);
      const res = await respondToQuote({
        requestId: request.id,
        clientUserId: user.id,
        accept,
      });

      if (res.success) {
        setRequest((prev) => prev ? { ...prev, status: res.newStatus } : null);
        if (accept) {
          // Immediately prompt deposit checkout
          setPaymentType('deposit');
          setPaymentModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Quote response error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Designer marks order ready for balance
  const handleMarkReadyForBalance = async () => {
    if (!user || !request) return;
    try {
      setActionLoading(true);
      const res = await markOrderReadyForBalance({
        requestId: request.id,
        designerUserId: user.id,
      });

      if (res.success) {
        setRequest((prev) => prev ? { ...prev, status: 'ready_for_balance' } : null);
      }
    } catch (err) {
      console.error('Error marking ready for balance:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Request Not Found</h2>
        <Link href="/" className="text-brand-600 font-semibold text-sm hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const isClient = user?.id === request.client_id;
  const isDesigner = designer?.user_id === user?.id;
  const partnerName = isClient
    ? designer?.business_name || 'Designer Atelier'
    : clientProfile?.full_name || 'Fashion Client';

  const breakdown = calculatePaymentBreakdown(request.quoted_price || request.budget_min);

  // Status mapping for visual workflow indicator
  const getWorkflowStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'quoted':
      case 'accepted':
        return 2;
      case 'deposit_paid':
      case 'in_progress':
        return 3;
      case 'ready_for_balance':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getWorkflowStep(request.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-5rem)] flex flex-col gap-3">
      
      {/* Top Header & Partner Info */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={isClient ? '/requests' : '/dashboard'}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-stone-900 text-base sm:text-lg">
                {partnerName}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  request.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : request.status === 'ready_for_balance'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : request.status === 'deposit_paid' || request.status === 'in_progress'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : request.status === 'accepted'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : request.status === 'quoted'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : request.status === 'declined'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                {request.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">
              Order: {request.style_description} • {request.quoted_price ? `Quoted: ₦${request.quoted_price.toLocaleString()}` : `Budget: ₦${request.budget_min.toLocaleString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.measurements && (
            <button
              type="button"
              onClick={() => setMeasurementsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-700" />
              <span>Measurements</span>
            </button>
          )}
          {isClient && designer && (
            <Link
              href={`/designer/${designer.id}`}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
            >
              View Studio
            </Link>
          )}
        </div>
      </div>

      {/* Interactive Order Workflow Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3 shrink-0">
        
        {/* 4-Step Progress Indicator */}
        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold uppercase tracking-wider border-b border-stone-100 pb-2">
          <div className={`flex flex-col items-center gap-1 ${currentStep >= 1 ? 'text-amber-600' : 'text-stone-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${currentStep >= 1 ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
              1
            </div>
            <span className="hidden sm:inline">1. Studio Quote</span>
            <span className="sm:hidden">Quote</span>
          </div>

          <div className={`flex flex-col items-center gap-1 ${currentStep >= 2 ? 'text-amber-600' : 'text-stone-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${currentStep >= 2 ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
              2
            </div>
            <span className="hidden sm:inline">2. 40% Deposit</span>
            <span className="sm:hidden">Deposit</span>
          </div>

          <div className={`flex flex-col items-center gap-1 ${currentStep >= 3 ? 'text-amber-600' : 'text-stone-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${currentStep >= 3 ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
              3
            </div>
            <span className="hidden sm:inline">3. Tailoring</span>
            <span className="sm:hidden">Sewing</span>
          </div>

          <div className={`flex flex-col items-center gap-1 ${currentStep >= 4 ? 'text-amber-600' : 'text-stone-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${currentStep >= 4 ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
              4
            </div>
            <span className="hidden sm:inline">4. 60% Balance</span>
            <span className="sm:hidden">Balance</span>
          </div>
        </div>

        {/* Dynamic Context Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          
          {/* 1. PENDING STAGE */}
          {request.status === 'pending' && (
            <>
              <div className="space-y-0.5">
                <span className="font-black text-stone-900 block">Stage 1: Awaiting Studio Quote</span>
                <p className="text-stone-500">
                  {isDesigner
                    ? 'Review the client request, fabrics, and measurements to submit a formal price quote.'
                    : 'The atelier is reviewing your outfit request and will issue a formal price quote shortly.'}
                </p>
              </div>

              {isDesigner && (
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Send Studio Quote</span>
                </button>
              )}
            </>
          )}

          {/* 2. QUOTED STAGE */}
          {request.status === 'quoted' && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-stone-900">
                    Official Quote: ₦{request.quoted_price?.toLocaleString()}
                  </span>
                  {request.quote_deadline && (
                    <span className="text-stone-500">
                      • Ready by {new Date(request.quote_deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-stone-500">
                  Deposit to start (40%): <strong>₦{(request.deposit_amount || breakdown.depositAmount).toLocaleString()}</strong> • Balance (60%): <strong>₦{(request.balance_amount || breakdown.balanceAmount).toLocaleString()}</strong>
                </p>
              </div>

              {isClient ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleQuoteResponse(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Accept &amp; Pay Deposit</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleQuoteResponse(false)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Decline</span>
                  </button>
                </div>
              ) : (
                <span className="text-stone-400 font-medium italic">
                  Awaiting client acceptance...
                </span>
              )}
            </>
          )}

          {/* 3. ACCEPTED STAGE (Awaiting Deposit) */}
          {request.status === 'accepted' && (
            <>
              <div className="space-y-0.5">
                <span className="font-black text-stone-900 block">Stage 2: 40% Deposit Payable</span>
                <p className="text-stone-500">
                  {isClient
                    ? `Quote accepted! Pay the 40% commitment deposit (₦${(request.deposit_amount || breakdown.depositAmount).toLocaleString()}) to commence tailoring.`
                    : `Client accepted! Waiting for 40% deposit (₦${(request.deposit_amount || breakdown.depositAmount).toLocaleString()}) before production starts.`}
                </p>
              </div>

              {isClient && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('deposit');
                    setPaymentModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black shadow-md shadow-brand-600/25 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-amber-300" />
                  <span>Pay Deposit (₦{(request.deposit_amount || breakdown.depositAmount).toLocaleString()})</span>
                </button>
              )}
            </>
          )}

          {/* 4. DEPOSIT PAID / IN PRODUCTION */}
          {(request.status === 'deposit_paid' || request.status === 'in_progress') && (
            <>
              <div className="space-y-0.5">
                <span className="font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Deposit Paid (₦{(request.deposit_amount || breakdown.depositAmount).toLocaleString()}) • Production Active
                </span>
                <p className="text-stone-500">
                  {isDesigner
                    ? 'Outfit is actively being tailored. Once ready for delivery, mark it ready for final balance.'
                    : 'The atelier is sewing your garment. Discuss fittings, measurements, or progress updates in chat below.'}
                </p>
              </div>

              {isDesigner && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleMarkReadyForBalance}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-600/20 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mark Ready for Balance</span>
                </button>
              )}
            </>
          )}

          {/* 5. READY FOR BALANCE PAYMENT */}
          {request.status === 'ready_for_balance' && (
            <>
              <div className="space-y-0.5">
                <span className="font-black text-purple-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  Outfit Tailoring Finished! 60% Balance Payable
                </span>
                <p className="text-stone-500">
                  {isClient
                    ? `Your outfit is completed! Pay the final 60% balance (₦${(request.balance_amount || breakdown.balanceAmount).toLocaleString()}) to arrange delivery.`
                    : `You marked this outfit complete. Awaiting client's remaining 60% balance payment (₦${(request.balance_amount || breakdown.balanceAmount).toLocaleString()}).`}
                </p>
              </div>

              {isClient && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('balance');
                    setPaymentModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-600/25 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-purple-200" />
                  <span>Pay Balance (₦{(request.balance_amount || breakdown.balanceAmount).toLocaleString()})</span>
                </button>
              )}
            </>
          )}

          {/* 6. COMPLETED STAGE */}
          {request.status === 'completed' && (
            <>
              <div className="space-y-0.5">
                <span className="font-black text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Order Completed &amp; Fully Settled!
                </span>
                <p className="text-stone-500">
                  {hasReviewed
                    ? 'Thank you! Your feedback helps other Nigerians find authentic tailoring.'
                    : 'Leave a quick rating and feedback about your experience.'}
                </p>
              </div>

              {!hasReviewed && (
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-stone-950" />
                  <span>{isClient ? 'Rate Atelier' : 'Rate Client'}</span>
                </button>
              )}
            </>
          )}

          {/* 7. DECLINED STAGE */}
          {request.status === 'declined' && (
            <div className="text-stone-500 italic">
              This request was declined. You can browse other master tailors or submit a new commission.
            </div>
          )}

        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-4">
        
        {/* Style Reference Overview */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 max-w-lg mx-auto shadow-sm text-xs space-y-2 text-stone-600">
          <div className="flex items-center justify-between font-bold text-stone-800 pb-1.5 border-b border-stone-100">
            <span className="flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-brand-600" />
              Commission Summary
            </span>
            <span>
              {request.quoted_price ? `₦${request.quoted_price.toLocaleString()}` : `Budget: ₦${request.budget_min.toLocaleString()}`}
            </span>
          </div>
          <p className="text-stone-700 font-medium">{request.style_description}</p>
          {request.fabric && (
            <p><span className="font-semibold text-stone-500">Fabric:</span> {request.fabric}</p>
          )}
          {request.deadline && (
            <p><span className="font-semibold text-stone-500">Target Date:</span> {new Date(request.deadline).toLocaleDateString()}</p>
          )}
          {request.reference_image_url && (
            <div className="pt-1">
              <span className="font-semibold text-stone-500 block mb-1">Inspo Style:</span>
              <img
                src={request.reference_image_url}
                alt="Reference Outfit"
                className="w-20 h-20 object-cover rounded-xl border border-stone-200 shadow-xs"
              />
            </div>
          )}
        </div>

        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 space-y-1">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-600">No chat messages yet.</p>
            <p>Send a message below to discuss fittings, measurements, or fabric delivery.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isSystemNotice =
              msg.content.startsWith('📋 Official Studio Quote') ||
              msg.content.startsWith('💳 Deposit Paid') ||
              msg.content.startsWith('🎉 Balance Paid') ||
              msg.content.startsWith('✅ Client accepted') ||
              msg.content.startsWith('✨ Outfit Tailoring Completed');

            if (isSystemNotice) {
              return (
                <div key={msg.id} className="max-w-md mx-auto my-2 animate-fadeIn">
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-950 shadow-xs space-y-1">
                    <p className="font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <span className="text-[10px] text-amber-700/70 block text-right">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white border border-stone-200 text-stone-900 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-stone-400 px-1 mt-1 font-medium">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${partnerName}...`}
          className="flex-1 px-4 py-3 rounded-2xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white shadow-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 sm:px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Modal 1: Payment Modal (Stub for Paystack/Flutterwave swap) */}
      {user && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          request={request}
          type={paymentType}
          customerEmail={user.email || 'client@tailoram.com'}
          customerName={profile?.full_name || 'Tailoram Client'}
          onPaymentSuccess={async (result: PaymentResult) => {
            const nextStatus: any = paymentType === 'deposit' ? 'deposit_paid' : 'completed';
            setRequest((prev) => prev ? { ...prev, status: nextStatus } : null);
            await loadRequestAndMessages();
          }}
        />
      )}

      {/* Modal 2: Designer Quote Modal */}
      {isDesigner && user && (
        <QuoteModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          request={request}
          designerUserId={user.id}
          onQuoteSubmitted={async () => {
            await loadRequestAndMessages();
          }}
        />
      )}

      {/* Modal 3: Post-Order Review Modal */}
      {user && (
        <OrderReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          request={request}
          reviewerId={user.id}
          reviewerName={profile?.full_name || user.user_metadata?.full_name || 'Client'}
          revieweeId={isClient ? (designer?.user_id || request.designer_id) : request.client_id}
          revieweeName={isClient ? (designer?.business_name || 'Atelier') : (clientProfile?.full_name || 'Client')}
          isClientReviewingDesigner={isClient}
          onReviewSubmitted={() => {
            setHasReviewed(true);
          }}
        />
      )}

      {/* Modal 4: Client Measurements Modal */}
      {request.measurements && (
        <MeasurementsModal
          isOpen={measurementsModalOpen}
          onClose={() => setMeasurementsModalOpen(false)}
          measurements={request.measurements}
          clientName={clientProfile?.full_name || 'Client'}
          orderNumber={request.id.slice(0, 8)}
        />
      )}

    </div>
  );
}
