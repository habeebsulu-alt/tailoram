'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { compressImage } from '@/lib/imageCompressor';
import { DesignerProfile } from '@/lib/types';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Upload,
  Calendar,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react';

function RequestForm() {
  const params = useParams();
  const designerId = params?.designerId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const inspoUrl = searchParams.get('inspoUrl');
  const styleTitle = searchParams.get('styleTitle');

  const { user, profile, loading: authLoading } = useAuth();

  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [loadingDesigner, setLoadingDesigner] = useState(true);

  // Form fields
  const [styleDescription, setStyleDescription] = useState('');
  const [fabric, setFabric] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(inspoUrl || null);
  const [inspoPhotoUrl, setInspoPhotoUrl] = useState<string | null>(inspoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pre-fill inspiration if provided
  useEffect(() => {
    if (inspoUrl) {
      setInspoPhotoUrl(inspoUrl);
      setPreviewUrl(inspoUrl);
      setStyleDescription((prev) => {
        if (prev.trim()) return prev;
        return styleTitle
          ? `Hello! I would like to remake this "${styleTitle}" design from your portfolio showcase. Please let me know your timeline and requirement to tailor it for me.`
          : `Hello! I would like to remake this bespoke outfit from your portfolio showcase. Please let me know your timeline and requirement to tailor it for me.`;
      });
    }
  }, [inspoUrl, styleTitle]);

  // Load designer info
  useEffect(() => {
    async function loadDesigner() {
      if (!designerId) return;
      try {
        setLoadingDesigner(true);
        const { data, error } = await supabase
          .from('designer_profiles')
          .select('*, profiles:user_id(full_name)')
          .eq('id', designerId)
          .single();

        if (error) throw error;
        setDesigner(data as DesignerProfile);
      } catch (err) {
        console.error('Failed to load designer:', err);
      } finally {
        setLoadingDesigner(false);
      }
    }
    loadDesigner();
  }, [designerId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectUrl = inspoUrl 
        ? `/request/${designerId}?inspoUrl=${encodeURIComponent(inspoUrl)}&styleTitle=${encodeURIComponent(styleTitle || '')}`
        : `/request/${designerId}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [user, authLoading, router, designerId, inspoUrl, styleTitle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setInspoPhotoUrl(null); // Overridden with custom file
    }
  };

  const handleClearInspo = () => {
    setInspoPhotoUrl(null);
    setPreviewUrl(null);
    setReferenceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user || !profile) {
      setErrorMessage('Please log in to send a request.');
      return;
    }

    if (!styleDescription.trim()) {
      setErrorMessage('Please describe what you want made.');
      return;
    }

    const minBudget = parseFloat(budgetMin);
    if (isNaN(minBudget) || minBudget <= 0) {
      setErrorMessage('Please enter a valid minimum budget in Naira.');
      return;
    }

    const maxBudget = budgetMax ? parseFloat(budgetMax) : null;
    if (maxBudget !== null && maxBudget < minBudget) {
      setErrorMessage('Maximum budget cannot be less than minimum budget.');
      return;
    }

    try {
      setSubmitting(true);

      // Upload reference image if provided as file, or use inspo photo url
      let referenceImageUrl: string | null = inspoPhotoUrl || null;

      if (referenceFile) {
        const compressed = await compressImage(referenceFile, 1200, 1200, 0.8);
        const fileExt = compressed.name.split('.').pop() || 'webp';
        const fileName = `${user.id}/${Date.now()}-ref.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('requests')
          .upload(fileName, compressed, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          console.warn('Reference image upload failed:', uploadError.message);
          // Continue without reference image — not critical
        } else {
          const { data: { publicUrl } } = supabase.storage.from('requests').getPublicUrl(fileName);
          referenceImageUrl = publicUrl;
        }
      }

      // Insert request into database
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .insert([{
          client_id: user.id,
          designer_id: designerId,
          style_description: styleDescription.trim(),
          fabric: fabric.trim() || null,
          budget_min: minBudget,
          budget_max: maxBudget,
          deadline: deadline || null,
          reference_image_url: referenceImageUrl,
          status: 'pending',
        }])
        .select()
        .single();

      if (requestError) throw requestError;

      // Log analytics event
      logEvent({
        event_type: 'request_sent',
        user_id: user.id,
        designer_id: designerId,
        metadata: {
          request_id: requestData?.id,
          budget_min: minBudget,
          budget_max: maxBudget,
          has_reference_image: !!referenceImageUrl,
          has_deadline: !!deadline,
          used_inspo: !!inspoPhotoUrl,
        },
      });

      setSuccessMessage('Your custom request has been sent! The designer will review it and respond soon.');
      
      // Reset form
      setStyleDescription('');
      setFabric('');
      setBudgetMin('');
      setBudgetMax('');
      setDeadline('');
      setReferenceFile(null);
      setPreviewUrl(null);
      setInspoPhotoUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
      console.error('Request submission failed:', err);
      setErrorMessage(err.message || 'Failed to send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingDesigner) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900">Designer Not Found</h2>
        <Link href="/" className="text-brand-600 font-semibold text-sm hover:underline">
          ← Browse other designers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Back link */}
      <Link
        href={`/designer/${designer.id}`}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {designer.business_name}
      </Link>

      {/* Designer summary card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-stone-900 truncate">{designer.business_name}</h2>
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {designer.area}, {designer.state}
          </p>
        </div>
      </div>

      {/* Selected Inspiration Card (if coming from "Use as Inspo") */}
      {inspoPhotoUrl && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-center gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-amber-300 shadow-xs">
            <img src={inspoPhotoUrl} alt="Inspiration Outfit" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3 fill-amber-700 text-amber-700" />
                Style Inspiration Selected
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-stone-900 truncate mt-1">
              {styleTitle || 'Showcase Garment'}
            </p>
            <p className="text-[11px] sm:text-xs text-stone-600">
              Attached as the reference photo for this remake order.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearInspo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-amber-100/80 transition-colors"
            title="Remove inspiration reference"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main request form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            Send Custom Request
            {inspoPhotoUrl && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                Remake Inspo
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Describe exactly what you want made. {designer.business_name} will review your specifications and accept or negotiate terms.
          </p>
        </div>

        {/* Success */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{successMessage}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/requests"
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                Track in My Requests →
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Style Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Outfit Description &amp; Custom Details <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={styleDescription}
                onChange={(e) => setStyleDescription(e.target.value)}
                placeholder="Describe your design (e.g. 3-piece emerald green Agbada with golden chest embroidery, fitted sleeves, matching fila cap and tailored trousers)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Fabric */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fabric / Material Preference <span className="text-stone-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                placeholder="E.g. Guinea brocade, Ankara wax, Cashmere, Lace, Aso-Oke..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Min Budget (₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Max Budget (₦) <span className="text-stone-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Needed By Date <span className="text-stone-400">(Optional)</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Reference Image */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Reference Photo {inspoPhotoUrl ? <span className="text-amber-600 font-bold">(Inspo attached)</span> : <span className="text-stone-400">(Optional)</span>}
                </label>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleClearInspo}
                    className="text-[11px] text-red-500 hover:underline font-semibold"
                  >
                    Clear reference
                  </button>
                )}
              </div>

              {previewUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] max-w-xs bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
                    <img src={previewUrl} alt="Reference" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                      {inspoPhotoUrl ? 'Portfolio Inspo' : 'Uploaded Photo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    To upload a different image instead, choose a file below:
                  </p>
                </div>
              ) : null}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="mt-2 w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-brand-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Request to {designer.business_name}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      }
    >
      <RequestForm />
    </Suspense>
  );
}
