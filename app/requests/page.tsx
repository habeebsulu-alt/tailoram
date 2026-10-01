'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OutfitRequest, Review } from '@/lib/types';
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
} from 'lucide-react';

export default function ClientRequestsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<OutfitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<OutfitRequest | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewedRequestIds, setReviewedRequestIds] = useState<string[]>([]);

  const fetchRequests = async (clientId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*, designer:designer_id(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as OutfitRequest[]) || []);

      // Check which requests already have reviews
      try {
        const { data: revData } = await supabase
          .from('reviews')
          .select('request_id')
          .eq('client_id', clientId);

        if (revData) {
          setReviewedRequestIds(revData.map((r) => r.request_id).filter(Boolean));
        }
      } catch (err) {
        // Table might not exist yet if SQL was not run
      }
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

  const handleOpenReview = (req: OutfitRequest) => {
    setTargetRequest(req);
    setRating(5);
    setComment('');
    setReviewSuccess('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetRequest) return;

    try {
      setSubmittingReview(true);
      const { error } = await supabase.from('reviews').insert([
        {
          designer_id: targetRequest.designer_id,
          client_id: user.id,
          request_id: targetRequest.id,
          rating: rating,
          comment: comment.trim() || null,
        },
      ]);

      if (error) throw error;

      setReviewSuccess('Thank you for your rating! Your feedback helps rank top tailors.');
      setReviewedRequestIds([...reviewedRequestIds, targetRequest.id]);
      setTimeout(() => {
        setReviewModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      alert(err.message || 'Could not submit review. Please ensure the reviews table is active in Supabase.');
    } finally {
      setSubmittingReview(false);
    }
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
            Track your bespoke tailoring orders, chat with designers, and rate finished creations.
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
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : req.status === 'completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {req.status}
                    </span>

                    <span className="text-xs text-stone-400 font-medium">
                      Sent {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-stone-900 text-base sm:text-lg">
                      {req.designer?.business_name || 'Designer'}
                    </h3>
                    <p className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      {req.designer?.area}, {req.designer?.state}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 line-clamp-2 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {req.style_description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 pt-1 font-medium">
                    <span>
                      Budget: <strong className="text-stone-900">₦{req.budget_min.toLocaleString()}</strong>
                      {req.budget_max ? ` - ₦${req.budget_max.toLocaleString()}` : ''}
                    </span>
                    {req.fabric && (
                      <span>Fabric: <strong className="text-stone-900">{req.fabric}</strong></span>
                    )}
                    {req.deadline && (
                      <span>Needed: <strong className="text-stone-900">{new Date(req.deadline).toLocaleDateString()}</strong></span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col items-center gap-2.5 flex-shrink-0">
                  <Link
                    href={`/messages/${req.id}`}
                    className="flex-1 md:w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-brand-400" />
                    Chat with Tailor
                  </Link>

                  {req.status === 'completed' && !hasReviewed && (
                    <button
                      onClick={() => handleOpenReview(req)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Star className="w-4 h-4 fill-white" />
                      Rate &amp; Review
                    </button>
                  )}

                  {hasReviewed && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && targetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Rate {targetRequest.designer?.business_name}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                    How was your experience? (Rating)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-stone-700 ml-2">
                      {rating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Review / Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share how the fitting went, fabric quality, timeliness, and customer service..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingReview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
