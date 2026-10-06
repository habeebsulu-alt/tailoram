'use client';

import React, { useState, useEffect } from 'react';
import { OutfitRequest } from '@/lib/types';
import {
  collectPayment,
  calculatePaymentBreakdown,
  PaymentResult,
  DEPOSIT_PERCENTAGE,
  BALANCE_PERCENTAGE,
} from '@/lib/payments';
import { getWhatsAppDispatchUrl } from '@/lib/whatsappNotifications';
import { checkIsWhatsAppEnabled } from '@/lib/whatsappSettings';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OutfitRequest;
  type: 'deposit' | 'balance';
  customerEmail: string;
  customerName?: string;
  onPaymentSuccess: (result: PaymentResult) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  request,
  type,
  customerEmail,
  customerName,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PaymentResult | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  useEffect(() => {
    checkIsWhatsAppEnabled().then(setWhatsappEnabled);
  }, []);

  if (!isOpen) return null;

  const quotedTotal = request.quoted_price || request.budget_min || 0;
  const breakdown = calculatePaymentBreakdown(quotedTotal);
  
  const paymentAmount =
    type === 'deposit'
      ? request.deposit_amount || breakdown.depositAmount
      : request.balance_amount || breakdown.balanceAmount;

  const isDeposit = type === 'deposit';

  const handlePay = async () => {
    try {
      setProcessing(true);
      setError(null);

      // ALL payment execution goes through this single function
      const result = await collectPayment({
        requestId: request.id,
        type,
        amount: paymentAmount,
        customer: {
          email: customerEmail,
          name: customerName,
        },
        metadata: {
          designer_id: request.designer_id,
          style: request.style_description,
        },
      });

      if (result.success) {
        // Construct 1-click WhatsApp notification to inform designer of payment
        const waUrl = getWhatsAppDispatchUrl({
          event: isDeposit ? 'deposit_paid' : 'balance_paid',
          recipientPhone: request.designer?.whatsapp,
          recipientName: request.designer?.business_name || 'Master Designer',
          senderName: customerName || 'A Client',
          styleDescription: request.style_description,
          amount: paymentAmount,
          requestId: request.id,
        });
        setWhatsappUrl(waUrl);
        setSuccessResult(result);
        onPaymentSuccess(result);
      } else {
        setError(result.message || 'Payment could not be completed.');
      }
    } catch (err: any) {
      console.error('Payment execution error:', err);
      setError(err.message || 'A network error occurred while processing payment.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn"
      onClick={() => !processing && onClose()}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-stone-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {isDeposit ? 'Stage 1 • 40% Deposit' : 'Stage 2 • 60% Final Balance'}
              </span>
              <h3 className="font-black text-lg text-stone-900 mt-1">
                {isDeposit ? 'Commitment Deposit' : 'Final Balance Payment'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success State */}
        {successResult ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-xl font-black text-stone-900">
                Payment Confirmed!
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                {successResult.message}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between text-stone-500">
                <span>Reference:</span>
                <span className="font-bold text-stone-900">{successResult.reference}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Amount:</span>
                <span className="font-bold text-emerald-600">₦{successResult.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Status:</span>
                <span className="font-bold text-stone-900">Settled (Simulated)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {whatsappEnabled && whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 fill-emerald-200 text-emerald-200" />
                  <span>Notify {request.designer?.business_name || 'Designer'} on WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
              >
                Done &amp; Continue
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Callout */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-white rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Payable Now</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isDeposit ? '40% Commitment' : '60% Completion'}
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                ₦{paymentAmount.toLocaleString()}
              </div>

              <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-300 flex items-center justify-between">
                <span>Total Quoted Outfit:</span>
                <strong className="text-white">₦{quotedTotal.toLocaleString()}</strong>
              </div>
            </div>

            {/* Error notice if any */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary & Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Designer:</span>
                <span className="font-bold text-stone-900 truncate max-w-[200px]">
                  {request.designer?.business_name || 'Bespoke Designer'}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Outfit Style:</span>
                <span className="font-medium text-stone-800 truncate max-w-[200px]">
                  {request.style_description}
                </span>
              </div>
              {isDeposit ? (
                <div className="flex justify-between text-stone-500 pt-1 border-t border-stone-100">
                  <span>Balance payable upon completion:</span>
                  <span className="font-bold text-stone-700">₦{breakdown.balanceAmount.toLocaleString()} (60%)</span>
                </div>
              ) : (
                <div className="flex justify-between text-stone-500 pt-1 border-t border-stone-100">
                  <span>Prior deposit paid:</span>
                  <span className="font-bold text-emerald-600">₦{(request.deposit_amount || breakdown.depositAmount).toLocaleString()} (40%)</span>
                </div>
              )}
            </div>

            {/* Gateway Stub Simulation Banner */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Payment Gateway Sandbox Mode</strong>
                <span>
                  Testing simulated checkout. In production, this modal invokes Paystack or Flutterwave NGN card/bank transfer checkout.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePay}
                disabled={processing}
                className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-brand-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Payment Simulation...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Pay ₦{paymentAmount.toLocaleString()} ({isDeposit ? '40% Deposit' : '60% Balance'})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="w-full py-2.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
