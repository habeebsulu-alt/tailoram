'use client';

import React, { useState } from 'react';
import { OutfitRequest, Review } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { saveLocalUserReview, resolveReviewClientName } from '@/lib/ratingsManager';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OutfitRequest;
  reviewerId: string;
  reviewerName?: string;
  revieweeId: string;
  revieweeName: string;
  isClientReviewingDesigner: boolean;
  onReviewSubmitted: () => void;
}

export default function OrderReviewModal({
  isOpen,
  onClose,
  request,
  reviewerId,
  reviewerName,
  revieweeId,
  revieweeName,
  isClientReviewingDesigner,
  onReviewSubmitted,
}: OrderReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Resolve actual client name instead of generic 'Client'
      const resolvedClientName = isClientReviewingDesigner
        ? (reviewerName || request.client?.full_name || resolveReviewClientName({ reviewer_id: reviewerId, client_id: reviewerId }))
        : (request.client?.full_name || resolveReviewClientName({ client_id: revieweeId }) || revieweeName);

      const reviewRecord: Review = {
        id: reviewId,
        request_id: request.id,
        designer_id: request.designer_id,
        client_id: isClientReviewingDesigner ? reviewerId : revieweeId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
        client: {
          id: isClientReviewingDesigner ? reviewerId : revieweeId,
          full_name: resolvedClientName,
          role: 'client',
          created_at: new Date().toISOString(),
        },
        designer: request.designer || { business_name: revieweeName || 'Studio' },
      };

      // 1. Save locally for zero-latency, demo resilience, and admin/designer visibility
      saveLocalUserReview(reviewRecord);
      if (typeof window !== 'undefined') {
        const key = `tailoram_request_review_${request.id}_${reviewerId}`;
        localStorage.setItem(key, JSON.stringify(reviewRecord));
      }

      // 2. Save to Supabase reviews table (with fallback for legacy columns)
      try {
        const { error: revErr } = await supabase.from('reviews').insert([{
          id: reviewId,
          request_id: request.id,
          designer_id: request.designer_id,
          client_id: isClientReviewingDesigner ? reviewerId : revieweeId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim() || null,
        }]);

        if (revErr) {
          console.warn('Full review insert failed, attempting standard schema insert:', revErr.message);
          // Fallback to standard schema without reviewer_id/reviewee_id
          await supabase.from('reviews').insert([{
            designer_id: request.designer_id,
            client_id: isClientReviewingDesigner ? reviewerId : revieweeId,
            rating,
            comment: comment.trim() || null,
            request_id: request.id,
          }]);
        }
      } catch (dbErr) {
        console.warn('Supabase review insert exception:', dbErr);
      }

      setSuccess(true);
      setTimeout(() => {
        onReviewSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || rating;

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
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-900">
                {isClientReviewingDesigner ? 'Rate Your Designer' : 'Rate Your Client'}
              </h3>
              <p className="text-xs text-stone-500">
                {revieweeName} • Order #{request.id.slice(0, 8)}
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

        {success ? (
          <div className="py-8 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-stone-900">
              Review Submitted!
            </h4>
            <p className="text-xs text-stone-500">
              Thank you for sharing your experience and helping build trust on Tailoram.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Star Rating Picker */}
            <div className="text-center py-2 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Select Star Rating
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= currentDisplayRating
                          ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                          : 'text-stone-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-900">
                {currentDisplayRating === 5 && '⭐⭐⭐⭐⭐ Exceptional Masterwork!'}
                {currentDisplayRating === 4 && '⭐⭐⭐⭐ Great tailoring & fit'}
                {currentDisplayRating === 3 && '⭐⭐⭐ Good experience'}
                {currentDisplayRating === 2 && '⭐⭐ Needs improvement'}
                {currentDisplayRating === 1 && '⭐ Disappointing experience'}
              </p>
            </div>

            {/* Comment Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {isClientReviewingDesigner
                  ? 'Your Review / Stitching & Delivery Feedback'
                  : 'Client Feedback (Communication, Promptness, Fittings)'}
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isClientReviewingDesigner
                    ? 'How was the fabric quality, stitching accuracy, fit, and delivery speed?'
                    : 'How was the communication, measurement provision, and responsiveness?'
                }
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Publishing Review...</span>
                  </>
                ) : (
                  <span>Publish Review ({rating} Stars)</span>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
