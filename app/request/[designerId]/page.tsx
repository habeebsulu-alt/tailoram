'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';

export default function RequestPage() {
  const params = useParams();
  const designerId = params?.designerId as string;
  const router = useRouter();
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      router.push(`/login?redirect=/request/${designerId}`);
    }
  }, [user, authLoading, router, designerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
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

      // Upload reference image if provided
      let referenceImageUrl: string | null = null;
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

      {/* Main request form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Send Custom Request
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Describe exactly what you want made. The designer will review and accept or suggest changes.
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
                href={`/designer/${designer.id}`}
                className="text-xs font-bold text-emerald-700 underline"
              >
                View designer profile →
              </Link>
              <Link
                href="/"
                className="text-xs font-bold text-emerald-700 underline"
              >
                Browse more designers →
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Style Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                What do you want made? <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={styleDescription}
                onChange={(e) => setStyleDescription(e.target.value)}
                placeholder="E.g. I need a 3-piece Agbada for my wedding — royal blue with gold embroidery on the top. Fitted trousers style, not too loose. Matching cap (fila)."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Fabric */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Preferred Fabric (Optional)
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
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reference Photo <span className="text-stone-400">(Optional — show the designer a style you like)</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
              {previewUrl && (
                <div className="mt-3 aspect-[4/3] max-w-xs bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
                  <img src={previewUrl} alt="Reference" className="w-full h-full object-cover" />
                </div>
              )}
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
