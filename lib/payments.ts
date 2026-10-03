import { supabase } from '@/lib/supabase';
import { Payment, RequestStatus, OutfitRequest } from '@/lib/types';
import { logEvent } from '@/lib/analytics';
import { triggerEmailNotification, resolveUserEmail } from '@/lib/emailNotifications';

/**
 * =========================================================================================
 * TAILORAM PAYMENT GATEWAY MODULE (PAYMENT ABSTRACTION POINT)
 * =========================================================================================
 * 
 * ⚠️ TEMPORARY STUB IMPLEMENTATION NOTICE ⚠️
 * 
 * CURRENT STATUS:
 * This module is a simulated payment collector (stub). It provides a full, realistic API
 * contract for charging deposits and balances without requiring live Paystack or Flutterwave
 * API keys.
 * 
 * FUTURE TASK / GATEWAY SWAP ROADMAP:
 * When a live Paystack or Flutterwave merchant account is ready, ONLY the internal body of
 * `collectPayment()` needs to be replaced. Every UI screen, checkout modal, and dashboard
 * calls `collectPayment()` exclusively. NO changes to pages or UI components will be required.
 * 
 * WHEN SWAPPING TO REAL GATEWAY:
 * 1. Initialize Charge:
 *    - Paystack: Call `https://api.paystack.co/transaction/initialize` or the Paystack Popup SDK
 *      passing `email`, `amount * 100` (in kobo), `reference`, and `callback_url`.
 *    - Flutterwave: Call `https://api.flutterwave.com/v3/payments` with `tx_ref`, `currency: 'NGN'`.
 * 2. Webhook & Verification:
 *    - Handle verification callback via `/api/webhooks/paystack` or `paystack.transaction.verify(ref)`.
 * 3. Handle Failure / Retry:
 *    - Inspect gateway response status; throw meaningful Nigerian card error messages (e.g. insufficient funds,
 *      card expired, OTP failed) instead of assuming automatic success.
 * 4. Payouts / Escrow:
 *    - Once verified, disburse deposit (40%) or hold in escrow until designer completes work.
 * =========================================================================================
 */

/**
 * Configurable payment split percentages
 */
export const DEPOSIT_PERCENTAGE = 0.40; // 40% initial commitment deposit
export const BALANCE_PERCENTAGE = 0.60; // 60% completion balance

/**
 * Payment collection input parameters
 */
export interface CollectPaymentParams {
  requestId: string;
  type: 'deposit' | 'balance';
  amount: number;
  customer: {
    userId?: string;
    email: string;
    name?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Standardized payment result returned to UI callers
 */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  reference: string;
  amount: number;
  type: 'deposit' | 'balance';
  paidAt: string;
  message: string;
  gateway: 'stub' | 'paystack' | 'flutterwave';
  status: 'stub_success' | 'success' | 'failed' | 'pending';
  rawResponse?: any;
}

/**
 * LocalStorage keys for fallback demo resilience
 */
const LOCAL_STORAGE_PAYMENTS_KEY = 'tailoram_payments';
const LOCAL_STORAGE_REQUESTS_OVERRIDES_KEY = 'tailoram_requests_overrides';
const LOCAL_STORAGE_CREATED_REQUESTS_KEY = 'tailoram_local_created_requests';

/**
 * Get locally stored bespoke requests (for demo users / offline fallback)
 */
export function getLocalCreatedRequests(): OutfitRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_CREATED_REQUESTS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Save a newly created bespoke request locally
 */
export function saveLocalCreatedRequest(req: OutfitRequest) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCreatedRequests();
    const filtered = list.filter((item) => item.id !== req.id);
    filtered.unshift(req);
    localStorage.setItem(LOCAL_STORAGE_CREATED_REQUESTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not save local created request:', err);
  }
}

/**
 * Helper to calculate deposit and balance amounts from a quoted total
 */
export function calculatePaymentBreakdown(quotedPrice: number) {
  const cleanPrice = Math.max(0, Number(quotedPrice) || 0);
  const depositAmount = Math.round(cleanPrice * DEPOSIT_PERCENTAGE);
  const balanceAmount = cleanPrice - depositAmount; // Guarantees exact sum = quotedPrice
  return {
    quotedPrice: cleanPrice,
    depositAmount,
    balanceAmount,
    depositPercentage: Math.round(DEPOSIT_PERCENTAGE * 100),
    balancePercentage: Math.round(BALANCE_PERCENTAGE * 100),
  };
}

/**
 * Get locally cached request overrides (for demo users / offline resilience)
 */
export function getLocalRequestOverrides(): Record<string, Partial<OutfitRequest>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_REQUESTS_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Save request override to localStorage
 */
export function saveLocalRequestOverride(requestId: string, updates: Partial<OutfitRequest>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalRequestOverrides();
    existing[requestId] = { ...(existing[requestId] || {}), ...updates };
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_OVERRIDES_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Could not save local request override:', err);
  }
}

/**
 * Get all payments for a specific request
 */
export async function getPaymentsForRequest(requestId: string): Promise<Payment[]> {
  const localList: Payment[] = [];
  if (typeof window !== 'undefined') {
    try {
      const allPayments: Payment[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY) || '[]');
      localList.push(...allPayments.filter((p) => p.request_id === requestId));
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      // Merge with local list avoiding duplicates by id
      const ids = new Set(data.map((p) => p.id));
      const filteredLocal = localList.filter((p) => !ids.has(p.id));
      return [...data, ...filteredLocal] as Payment[];
    }
  } catch (err) {
    console.warn('Failed to fetch payments from Supabase, using local fallback:', err);
  }

  return localList;
}

/**
 * Helper to fetch request client and designer contact details for notifications
 */
export async function getRequestParticipants(requestId: string): Promise<{
  clientId?: string;
  designerUserId?: string;
  designerName?: string;
  clientName?: string;
}> {
  try {
    const { data } = await supabase
      .from('requests')
      .select('client_id, designer_id, client:client_id(full_name), designer:designer_id(business_name, user_id)')
      .eq('id', requestId)
      .maybeSingle();

    if (data) {
      return {
        clientId: data.client_id,
        designerUserId: (data.designer as any)?.user_id,
        designerName: (data.designer as any)?.business_name,
        clientName: (data.client as any)?.full_name,
      };
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // Check locally created requests fallback
  const localReq = getLocalCreatedRequests().find((r) => r.id === requestId);
  if (localReq) {
    return {
      clientId: localReq.client_id,
      designerUserId: (localReq.designer as any)?.user_id,
      designerName: localReq.designer?.business_name,
      clientName: (localReq.client as any)?.full_name,
    };
  }

  return {};
}

/**
 * Save a payment record locally and to Supabase
 */
async function recordPayment(payment: Payment): Promise<void> {
  // 1. Save to localStorage for instant local availability
  if (typeof window !== 'undefined') {
    try {
      const allPayments: Payment[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY) || '[]');
      allPayments.unshift(payment);
      localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(allPayments));
    } catch (e) {
      console.warn('Could not save payment to localStorage:', e);
    }
  }

  // 2. Insert into Supabase payments table
  try {
    const { error } = await supabase.from('payments').insert([
      {
        id: payment.id,
        request_id: payment.request_id,
        type: payment.type,
        amount: payment.amount,
        status: payment.status,
        gateway_reference: payment.gateway_reference,
        metadata: payment.metadata || {},
      },
    ]);

    if (error) {
      console.warn('Could not insert payment into Supabase (table may need migration):', error.message);
    }
  } catch (err) {
    console.warn('Supabase payments insert error:', err);
  }
}

/**
 * =========================================================================================
 * CORE FUNCTION: collectPayment
 * =========================================================================================
 * This is the SINGLE gateway function called whenever a client pays a deposit or balance.
 * Currently simulated via stub. In the future, this will initiate a real Paystack/Flutterwave charge.
 */
export async function collectPayment({
  requestId,
  type,
  amount,
  customer,
  metadata = {},
}: CollectPaymentParams): Promise<PaymentResult> {
  const paidAt = new Date().toISOString();
  
  // Generate realistic gateway transaction reference
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestampCode = Date.now().toString(36).toUpperCase();
  const reference = `TLR-STUB-${type.toUpperCase()}-${timestampCode}-${randomSuffix}`;
  const transactionId = `txn_${timestampCode.toLowerCase()}_${randomSuffix.toLowerCase()}`;

  // Simulate network latency (500ms - 800ms) for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 650));

  // Determine new request status & attributes based on payment type
  const isDeposit = type === 'deposit';
  const newStatus: RequestStatus = isDeposit ? 'deposit_paid' : 'completed';

  const requestUpdates: Partial<OutfitRequest> = isDeposit
    ? {
        status: 'deposit_paid',
        deposit_amount: amount,
        deposit_paid_at: paidAt,
      }
    : {
        status: 'completed',
        balance_amount: amount,
        balance_paid_at: paidAt,
      };

  // 1. Create Payment record
  const paymentRecord: Payment = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`,
    request_id: requestId,
    type,
    amount,
    status: 'stub_success',
    gateway_reference: reference,
    metadata: {
      ...metadata,
      customer_email: customer.email,
      customer_name: customer.name,
      gateway: 'stub',
      note: 'Simulated payment stub - ready for Paystack/Flutterwave swap',
    },
    created_at: paidAt,
  };

  // 2. Persist payment
  await recordPayment(paymentRecord);

  // 3. Update requests table in Supabase
  try {
    const { error: reqError } = await supabase
      .from('requests')
      .update(requestUpdates)
      .eq('id', requestId);

    if (reqError) {
      console.warn('Could not update request in Supabase:', reqError.message);
    }
  } catch (err) {
    console.warn('Supabase request update error:', err);
  }

  // 4. Update local request overrides
  saveLocalRequestOverride(requestId, requestUpdates);

  // 5. Post automatic system confirmation message to chat thread
  try {
    const systemNotice = isDeposit
      ? `💳 Deposit Paid: ₦${amount.toLocaleString()} (40% initial commitment). Payment reference: ${reference}. Atelier production has officially commenced!`
      : `🎉 Balance Paid: ₦${amount.toLocaleString()} (60% final balance). Payment reference: ${reference}. Order is fully paid and completed!`;

    const { data: currentAuth } = await supabase.auth.getUser();
    const senderId = currentAuth?.user?.id || (customer as any)?.userId;

    if (senderId) {
      await supabase.from('messages').insert([
        {
          request_id: requestId,
          sender_id: senderId,
          content: systemNotice,
        },
      ]);
    }
  } catch (msgErr) {
    console.warn('Could not post automated payment receipt message:', msgErr);
  }

  // 6. Log analytics event
  try {
    await logEvent({
      event_type: 'request_status_change',
      user_id: customer.userId,
      metadata: {
        requestId,
        type,
        amount,
        reference,
        gateway: 'stub',
        status: newStatus,
      },
    });
  } catch (evErr) {
    console.warn('Analytics event error:', evErr);
  }

  // 7. Dispatch automatic email notification
  try {
    const participants = await getRequestParticipants(requestId);
    const targetEmail = resolveUserEmail(
      participants.designerUserId,
      'designer@tailoram.com'
    );
    const clientName = customer.name || customer.email || participants.clientName || 'A Tailoram Client';

    if (isDeposit) {
      await triggerEmailNotification({
        event: 'deposit_paid',
        recipientEmail: targetEmail,
        recipientName: participants.designerName || 'Designer Atelier',
        subject: `💳 40% Deposit Received (₦${amount.toLocaleString()}) - Start Production`,
        previewText: `${clientName} has confirmed payment of the 40% initial commitment deposit (₦${amount.toLocaleString()}). Payment reference: ${reference}. Production can now begin!`,
        ctaLink: `https://tailoram.vercel.app/messages/${requestId}`,
        metadata: { requestId, amount, reference, type: 'deposit' },
      });
    } else {
      await triggerEmailNotification({
        event: 'balance_paid',
        recipientEmail: targetEmail,
        recipientName: participants.designerName || 'Designer Atelier',
        subject: `🎉 60% Balance Paid (₦${amount.toLocaleString()}) - Commission Completed`,
        previewText: `${clientName} has paid the remaining 60% completion balance (₦${amount.toLocaleString()}). Payment reference: ${reference}. Order is fully settled and ready for handover!`,
        ctaLink: `https://tailoram.vercel.app/messages/${requestId}`,
        metadata: { requestId, amount, reference, type: 'balance' },
      });
    }
  } catch (emailErr) {
    console.warn('Payment notification error:', emailErr);
  }

  return {
    success: true,
    transactionId,
    reference,
    amount,
    type,
    paidAt,
    message: isDeposit
      ? `40% commitment deposit of ₦${amount.toLocaleString()} confirmed successfully.`
      : `Final balance of ₦${amount.toLocaleString()} confirmed successfully. Order is complete!`,
    gateway: 'stub',
    status: 'stub_success',
    rawResponse: {
      simulated: true,
      reference,
      transactionId,
      paidAt,
    },
  };
}

/**
 * =========================================================================================
 * QUOTE MANAGEMENT WORKFLOW
 * =========================================================================================
 */

/**
 * Submit an official quote on a request (Designer action)
 */
export async function submitQuote({
  requestId,
  designerUserId,
  quotedPrice,
  quoteDeadline,
}: {
  requestId: string;
  designerUserId: string;
  quotedPrice: number;
  quoteDeadline: string;
}): Promise<{ success: boolean; error?: string }> {
  const breakdown = calculatePaymentBreakdown(quotedPrice);

  const updates: Partial<OutfitRequest> = {
    status: 'quoted',
    quoted_price: breakdown.quotedPrice,
    quote_deadline: quoteDeadline,
    deposit_amount: breakdown.depositAmount,
    balance_amount: breakdown.balanceAmount,
  };

  // 1. Update Supabase
  try {
    const { error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      console.warn('Could not update request quote in Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase quote update error:', err);
  }

  // 2. Save locally for demo fallback
  saveLocalRequestOverride(requestId, updates);

  // 3. Post consultation chat message
  try {
    const quoteMessage = `📋 Official Studio Quote Submitted:\n• Total Price: ₦${breakdown.quotedPrice.toLocaleString()}\n• 40% Deposit to Start: ₦${breakdown.depositAmount.toLocaleString()}\n• 60% Balance on Finish: ₦${breakdown.balanceAmount.toLocaleString()}\n• Estimated Delivery: ${new Date(quoteDeadline).toLocaleDateString(undefined, { dateStyle: 'medium' })}`;

    await supabase.from('messages').insert([
      {
        request_id: requestId,
        sender_id: designerUserId,
        content: quoteMessage,
      },
    ]);
  } catch (msgErr) {
    console.warn('Could not post quote message to chat:', msgErr);
  }

  // 4. Dispatch email notification to client
  try {
    const participants = await getRequestParticipants(requestId);
    const targetEmail = resolveUserEmail(participants.clientId, 'client@tailoram.com');
    await triggerEmailNotification({
      event: 'quote_received',
      recipientEmail: targetEmail,
      recipientName: participants.clientName || 'Fashion Client',
      subject: `📋 Studio Quote Received: ₦${breakdown.quotedPrice.toLocaleString()} - ${participants.designerName || 'Tailoram Atelier'}`,
      previewText: `${participants.designerName || 'The atelier'} has submitted a quote of ₦${breakdown.quotedPrice.toLocaleString()} (40% deposit: ₦${breakdown.depositAmount.toLocaleString()}) for your bespoke request. Estimated delivery: ${new Date(quoteDeadline).toLocaleDateString()}.`,
      ctaLink: `https://tailoram.vercel.app/messages/${requestId}`,
      metadata: { requestId, quotedPrice: breakdown.quotedPrice, quoteDeadline },
    });
  } catch (emailErr) {
    console.warn('Quote email notification error:', emailErr);
  }

  return { success: true };
}

/**
 * Accept or decline a quote (Client action)
 */
export async function respondToQuote({
  requestId,
  clientUserId,
  accept,
}: {
  requestId: string;
  clientUserId: string;
  accept: boolean;
}): Promise<{ success: boolean; newStatus: RequestStatus; error?: string }> {
  const newStatus: RequestStatus = accept ? 'accepted' : 'declined';
  const updates: Partial<OutfitRequest> = { status: newStatus };

  try {
    const { error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      console.warn('Could not update quote response in Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase quote response error:', err);
  }

  saveLocalRequestOverride(requestId, updates);

  // Post chat notification
  try {
    const responseMessage = accept
      ? `✅ Client accepted the official quote. Awaiting 40% deposit payment to commence production.`
      : `❌ Client declined the quote. Consultation closed.`;

    await supabase.from('messages').insert([
      {
        request_id: requestId,
        sender_id: clientUserId,
        content: responseMessage,
      },
    ]);
  } catch (msgErr) {
    console.warn('Could not post acceptance/decline message to chat:', msgErr);
  }

  return { success: true, newStatus };
}

/**
 * Mark an order ready for balance payment (Designer action)
 */
export async function markOrderReadyForBalance({
  requestId,
  designerUserId,
}: {
  requestId: string;
  designerUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const updates: Partial<OutfitRequest> = { status: 'ready_for_balance' };

  try {
    const { error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      console.warn('Could not update status to ready_for_balance in Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase ready_for_balance update error:', err);
  }

  saveLocalRequestOverride(requestId, updates);

  // Post message to chat
  try {
    await supabase.from('messages').insert([
      {
        request_id: requestId,
        sender_id: designerUserId,
        content: `✨ Outfit Tailoring Completed! The atelier has marked your garment ready. Please proceed to pay the remaining 60% balance to finalize your commission and arrange delivery.`,
      },
    ]);
  } catch (msgErr) {
    console.warn('Could not post ready_for_balance message to chat:', msgErr);
  }

  // Dispatch email notification to client
  try {
    const participants = await getRequestParticipants(requestId);
    const targetEmail = resolveUserEmail(participants.clientId, 'client@tailoram.com');
    await triggerEmailNotification({
      event: 'order_ready',
      recipientEmail: targetEmail,
      recipientName: participants.clientName || 'Fashion Client',
      subject: `✨ Your Bespoke Outfit is Ready! Complete Balance on Tailoram`,
      previewText: `Great news! ${participants.designerName || 'The atelier'} has completed tailoring your garment. Please review and pay the remaining 60% balance to finalize delivery.`,
      ctaLink: `https://tailoram.vercel.app/messages/${requestId}`,
      metadata: { requestId },
    });
  } catch (emailErr) {
    console.warn('Ready notification error:', emailErr);
  }

  return { success: true };
}
