'use client';

import React, { useState, useEffect } from 'react';
import { OutfitRequest } from '@/lib/types';
import { submitQuote, calculatePaymentBreakdown } from '@/lib/payments';
import { getWhatsAppDispatchUrl } from '@/lib/whatsappNotifications';
import { checkIsWhatsAppEnabled } from '@/lib/whatsappSettings';
import {
  X,
  FileText,
  Calendar,
  DollarSign,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OutfitRequest;
  designerUserId: string;
  onQuoteSubmitted: () => void;
}

export default function QuoteModal({
  isOpen,
  onClose,
  request,
  designerUserId,
  onQuoteSubmitted,
}: QuoteModalProps) {
  // Default quoted price to client's min or max budget
  const initialPrice = request.budget_max || request.budget_min || 45000;
  
  // Default deadline to client's requested deadline or 14 days from now
  const defaultDate = request.deadline
    ? request.deadline
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const isTailorSourcingFabric = request.fabric_sourcing === 'tailor_sources';

  const [priceInput, setPriceInput] = useState<number>(initialPrice);
  const [fabricCostInput, setFabricCostInput] = useState<number | ''>(isTailorSourcingFabric ? Math.round(initialPrice * 0.35) : '');
  const [sewingCostInput, setSewingCostInput] = useState<number | ''>(isTailorSourcingFabric ? Math.round(initialPrice * 0.65) : initialPrice);
  const [deadlineInput, setDeadlineInput] = useState<string>(defaultDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  useEffect(() => {
    checkIsWhatsAppEnabled().then(setWhatsappEnabled);
  }, []);

  if (!isOpen) return null;

  const breakdown = calculatePaymentBreakdown(priceInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceInput || priceInput <= 0) {
      setError('Please enter a valid quoted price greater than zero.');
      return;
    }
    if (!deadlineInput) {
      setError('Please select an estimated completion date.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await submitQuote({
        requestId: request.id,
        designerUserId,
        quotedPrice: priceInput,
        quoteDeadline: deadlineInput,
        fabricCost: typeof fabricCostInput === 'number' && fabricCostInput > 0 ? fabricCostInput : undefined,
        sewingCost: typeof sewingCostInput === 'number' && sewingCostInput > 0 ? sewingCostInput : undefined,
      });

      if (res.success) {
        // Build 1-click WhatsApp notification URL for client
        const waUrl = getWhatsAppDispatchUrl({
          event: 'quote_submitted',
          recipientPhone: (request.client as any)?.whatsapp || (request.client as any)?.phone,
          recipientName: request.client?.full_name || 'Fashion Client',
          senderName: request.designer?.business_name || 'Your Designer',
          styleDescription: request.style_description,
          amount: breakdown.quotedPrice,
          depositAmount: breakdown.depositAmount,
          deadline: deadlineInput,
          requestId: request.id,
        });
        setWhatsappUrl(waUrl);
        setSubmittedSuccess(true);
        onQuoteSubmitted();
      } else {
        setError(res.error || 'Failed to submit quote.');
      }
    } catch (err: any) {
      console.error('Error submitting quote:', err);
      setError(err.message || 'Network error occurred while submitting quote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-stone-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-900">
                Send Official Studio Quote
              </h3>
              <p className="text-xs text-stone-500">
                Client: {request.client?.full_name || 'Bespoke Client'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View with 1-click WhatsApp Notification */}
        {submittedSuccess ? (
          <div className="py-6 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-xl font-black text-stone-900">
                Official Quote Sent!
              </h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Quote of <strong>₦{breakdown.quotedPrice.toLocaleString()}</strong> has been submitted. The client has received an in-app notice and email.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left text-xs space-y-1.5 font-medium">
              <div className="flex justify-between text-stone-700">
                <span>Quoted Total:</span>
                <strong className="text-stone-900 font-black">₦{breakdown.quotedPrice.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>40% Commitment Deposit:</span>
                <strong className="text-emerald-700 font-bold">₦{breakdown.depositAmount.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Target Completion:</span>
                <strong className="text-stone-900">{new Date(deadlineInput).toLocaleDateString()}</strong>
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
                  <span>Notify Client on WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
              >
                Close &amp; Return to Consultation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Client Request Context */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs space-y-1.5 text-stone-600">
              <div className="flex justify-between font-semibold text-stone-800">
                <span>Requested Style:</span>
                <span className="text-brand-700 font-bold truncate max-w-[200px]">{request.style_description}</span>
              </div>
              <div className="flex justify-between">
                <span>Client&apos;s Budget Range:</span>
                <span className="font-bold text-stone-900">
                  ₦{request.budget_min.toLocaleString()}
                  {request.budget_max ? ` - ₦${request.budget_max.toLocaleString()}` : ''}
                </span>
              </div>
              {/* Fabric Arrangement Badge */}
              <div className="pt-1 border-t border-stone-200/60 flex items-center justify-between">
                <span className="text-[11px] font-medium text-stone-500">Fabric Arrangement:</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isTailorSourcingFabric
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {isTailorSourcingFabric ? '🧵 Sourcing Required (Include in Quote)' : '📦 Client Providing Fabric'}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quote Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Total Quoted Price (₦ NGN) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="500"
                required
                value={priceInput || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriceInput(val);
                  if (isTailorSourcingFabric) {
                    setFabricCostInput(Math.round(val * 0.35));
                    setSewingCostInput(Math.round(val * 0.65));
                  }
                }}
                placeholder="e.g. 65000"
                className="w-full pl-9 pr-4 py-3 rounded-2xl border border-stone-300 text-stone-900 font-black text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
              <span className="absolute left-3.5 top-3.5 text-stone-400 font-bold text-base">
                ₦
              </span>
            </div>
          </div>

          {/* Optional Fabric Cost Breakdown (Highlighted if Tailor Sources) */}
          {isTailorSourcingFabric && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Quote Breakdown (Fabric Material + Workmanship)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Fabric Sourcing Cost (₦)
                  </label>
                  <input
                    type="number"
                    value={fabricCostInput}
                    onChange={(e) => {
                      const fCost = Number(e.target.value);
                      setFabricCostInput(fCost);
                      if (priceInput) setSewingCostInput(Math.max(0, priceInput - fCost));
                    }}
                    placeholder="e.g. 20000"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Sewing / Labor (₦)
                  </label>
                  <input
                    type="number"
                    value={sewingCostInput}
                    onChange={(e) => setSewingCostInput(Number(e.target.value))}
                    placeholder="e.g. 45000"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-stone-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Estimated Completion / Delivery Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 text-stone-900 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
          </div>

          {/* Real-time Payment Split Preview */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Automated 2-Stage Payment Schedule
            </span>
            <div className="flex justify-between items-center text-stone-700">
              <span>1. Upfront Deposit (40% to commence):</span>
              <strong className="text-stone-950 font-black">
                ₦{breakdown.depositAmount.toLocaleString()}
              </strong>
            </div>
            <div className="flex justify-between items-center text-stone-700">
              <span>2. Final Balance (60% upon completion):</span>
              <strong className="text-stone-950 font-black">
                ₦{breakdown.balanceAmount.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-brand-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting Official Quote...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Send Quote (₦{breakdown.quotedPrice.toLocaleString()})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
