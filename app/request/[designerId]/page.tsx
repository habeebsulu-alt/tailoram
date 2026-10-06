'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { compressImage } from '@/lib/imageCompressor';
import { DesignerProfile, OutfitRequest, ClientMeasurements, FabricSourcingType } from '@/lib/types';
import { saveLocalCreatedRequest, saveCloudChatMessage } from '@/lib/payments';
import { triggerEmailNotification, resolveUserEmail } from '@/lib/emailNotifications';
import { getWhatsAppDispatchUrl } from '@/lib/whatsappNotifications';
import { checkIsWhatsAppEnabled } from '@/lib/whatsappSettings';
import { getMeasurementVault } from '@/lib/measurementVault';
import { getAppBaseUrl } from '@/lib/appUrl';
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
  Ruler,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Package,
  ShoppingBag,
  Check,
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
  const [fabricSourcing, setFabricSourcing] = useState<FabricSourcingType>('client_provided');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(inspoUrl || null);
  const [inspoPhotoUrl, setInspoPhotoUrl] = useState<string | null>(inspoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client Measurement Vault & Sizing
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [vaultProfiles, setVaultProfiles] = useState<ClientMeasurements[]>([]);
  const [selectedVaultProfileId, setSelectedVaultProfileId] = useState<string>('');
  const [measurements, setMeasurements] = useState<ClientMeasurements>({
    chest: '',
    shoulder: '',
    sleeve: '',
    neck: '',
    waist: '',
    hips: '',
    top_length: '',
    trouser_length: '',
    thigh: '',
    agbada_length: '',
    fit_preference: 'regular',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [whatsappDispatchUrl, setWhatsappDispatchUrl] = useState<string | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Load user measurement vault profiles
  useEffect(() => {
    getMeasurementVault(user?.id).then((list) => {
      setVaultProfiles(list);
    });
  }, [user]);

  // Check if WhatsApp features are enabled platform-wide
  useEffect(() => {
    checkIsWhatsAppEnabled().then(setWhatsappEnabled);
  }, []);

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

      // Multi-tier resilient insert (Standard -> Security Definer RPC -> Local Persistence)
      let createdRequestId: string | null = null;

      // Extract cleaned measurements if provided
      const cleanedMeasurements: ClientMeasurements = {};
      if (showMeasurements) {
        if (measurements.chest?.trim()) cleanedMeasurements.chest = measurements.chest.trim();
        if (measurements.shoulder?.trim()) cleanedMeasurements.shoulder = measurements.shoulder.trim();
        if (measurements.sleeve?.trim()) cleanedMeasurements.sleeve = measurements.sleeve.trim();
        if (measurements.neck?.trim()) cleanedMeasurements.neck = measurements.neck.trim();
        if (measurements.waist?.trim()) cleanedMeasurements.waist = measurements.waist.trim();
        if (measurements.hips?.trim()) cleanedMeasurements.hips = measurements.hips.trim();
        if (measurements.top_length?.trim()) cleanedMeasurements.top_length = measurements.top_length.trim();
        if (measurements.trouser_length?.trim()) cleanedMeasurements.trouser_length = measurements.trouser_length.trim();
        if (measurements.thigh?.trim()) cleanedMeasurements.thigh = measurements.thigh.trim();
        if (measurements.agbada_length?.trim()) cleanedMeasurements.agbada_length = measurements.agbada_length.trim();
        if (measurements.fit_preference) cleanedMeasurements.fit_preference = measurements.fit_preference;
        if (measurements.notes?.trim()) cleanedMeasurements.notes = measurements.notes.trim();
      }
      const hasMeasurements = Object.keys(cleanedMeasurements).length > 0;
      const finalMeasurements = hasMeasurements ? cleanedMeasurements : null;

      // 1. Attempt standard Supabase insert
      try {
        const insertPayload: any = {
          client_id: user.id,
          designer_id: designerId,
          style_description: styleDescription.trim(),
          fabric: fabric.trim() || null,
          fabric_sourcing: fabricSourcing,
          budget_min: minBudget,
          budget_max: maxBudget,
          deadline: deadline || null,
          reference_image_url: referenceImageUrl,
          status: 'pending',
        };
        if (finalMeasurements) {
          insertPayload.measurements = finalMeasurements;
        }

        const { data: requestData, error: requestError } = await supabase
          .from('requests')
          .insert([insertPayload])
          .select('id')
          .single();

        if (!requestError && requestData?.id) {
          createdRequestId = requestData.id;
        } else if (requestError) {
          console.warn('Standard insert encountered an issue, testing fallback without measurements or with RPC:', requestError.message);
          // If error was about missing measurements or fabric_sourcing column, retry with base columns
          const { data: retryData, error: retryError } = await supabase
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
            .select('id')
            .single();

          if (!retryError && retryData?.id) {
            createdRequestId = retryData.id;
          }
        }
      } catch (insertErr) {
        console.warn('Insert exception:', insertErr);
      }

      // 2. If standard insert was blocked (e.g. by Supabase RLS), attempt security definer RPC
      if (!createdRequestId) {
        try {
          const { data: rpcId, error: rpcError } = await supabase.rpc('create_custom_request', {
            p_client_id: user.id,
            p_designer_id: designerId,
            p_style_description: styleDescription.trim(),
            p_fabric: fabric.trim() || null,
            p_budget_min: minBudget,
            p_budget_max: maxBudget,
            p_deadline: deadline || null,
            p_reference_image_url: referenceImageUrl,
            p_measurements: finalMeasurements,
          });

          if (!rpcError && rpcId) {
            createdRequestId = rpcId;
          } else if (rpcError) {
            console.warn('RPC create_custom_request failed:', rpcError.message);
          }
        } catch (rpcErr) {
          console.warn('RPC exception:', rpcErr);
        }
      }

      // 3. Guaranteed fallback (for demo accounts, offline resilience, or pending SQL migration)
      const finalRequestId = createdRequestId || `req-${Date.now()}`;

      // Save locally so it appears immediately on client's orders and designer's dashboard
      const localRequestObj: OutfitRequest = {
        id: finalRequestId,
        client_id: user.id,
        designer_id: designerId,
        style_description: styleDescription.trim(),
        fabric: fabric.trim() || null,
        fabric_sourcing: fabricSourcing,
        budget_min: minBudget,
        budget_max: maxBudget ?? null,
        deadline: deadline || null,
        reference_image_url: referenceImageUrl || null,
        measurements: finalMeasurements,
        status: 'pending',
        created_at: new Date().toISOString(),
        designer: designer || undefined,
        client: profile || undefined,
      };
      saveLocalCreatedRequest(localRequestObj);

      // Post initial request message into consultation chat with measurements summary
      try {
        const measurementSummary = hasMeasurements
          ? Object.entries(cleanedMeasurements)
              .filter(([k, v]) => k !== 'fit_preference' && k !== 'notes' && v)
              .map(([k, v]) => `• ${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${v}"`)
              .join('\n')
          : '';

        const sourcingNotice = fabricSourcing === 'tailor_sources'
          ? `🧵 Fabric Arrangement: Tailor to source and purchase fabric (Please include fabric cost + tailoring workmanship in quote).`
          : `📦 Fabric Arrangement: Client has fabric and will dispatch/deliver to studio.`;

        const chatContent = `👋 New bespoke request submitted:\n"${styleDescription.trim()}"\nBudget: ₦${minBudget.toLocaleString()}${maxBudget ? ` - ₦${maxBudget.toLocaleString()}` : ''}${deadline ? `\nTarget Delivery: ${new Date(deadline).toLocaleDateString()}` : ''}\n\n${sourcingNotice}${hasMeasurements ? `\n\n📐 Client Body Measurements (in):\n${measurementSummary}${cleanedMeasurements.fit_preference ? `\n• Fit Preference: ${cleanedMeasurements.fit_preference.toUpperCase()}` : ''}${cleanedMeasurements.notes ? `\n• Tailoring Notes: "${cleanedMeasurements.notes}"` : ''}` : ''}`;

        const msgObj = {
          id: `msg-req-${Date.now()}`,
          request_id: finalRequestId,
          sender_id: user.id,
          content: chatContent,
          created_at: new Date().toISOString(),
          sender: profile || undefined,
        };
        await saveCloudChatMessage(finalRequestId, msgObj);

        await supabase.from('messages').insert([
          {
            request_id: finalRequestId,
            sender_id: user.id,
            content: chatContent,
          },
        ]);
      } catch (msgErr) {
        console.warn('Chat notification error:', msgErr);
      }

      // Log analytics event
      logEvent({
        event_type: 'request_sent',
        user_id: user.id,
        designer_id: designerId,
        metadata: {
          request_id: finalRequestId,
          budget_min: minBudget,
          budget_max: maxBudget,
          has_reference_image: !!referenceImageUrl,
          has_deadline: !!deadline,
          used_inspo: !!inspoPhotoUrl,
        },
      });

      // Dispatch email notification to designer
      try {
        const designerEmail = resolveUserEmail(
          designer?.user_id,
          (designer as any)?.email || 'designer@tailoram.com'
        );
        await triggerEmailNotification({
          event: 'new_request',
          recipientEmail: designerEmail,
          recipientName: designer?.business_name || 'Master Designer',
          subject: `🧵 New Bespoke Commission Request from ${profile?.full_name || 'a Client'}`,
          previewText: `${profile?.full_name || 'A client'} just sent a new bespoke tailoring request: "${styleDescription.trim()}". Budget: ₦${minBudget.toLocaleString()}${maxBudget ? ` - ₦${maxBudget.toLocaleString()}` : ''}. Review details and submit a quote on Tailoram.`,
          ctaLink: `${getAppBaseUrl()}/messages/${finalRequestId}`,
          metadata: { requestId: finalRequestId, designerId },
        });
      } catch (emErr) {
        console.warn('New request email notification error:', emErr);
      }

      // Prepare 1-click WhatsApp notification URL for the client to immediately notify designer
      const waUrl = getWhatsAppDispatchUrl({
        event: 'new_request',
        recipientPhone: designer?.whatsapp,
        recipientName: designer?.business_name,
        senderName: profile?.full_name || 'A Client',
        styleDescription: styleDescription.trim(),
        amount: minBudget,
        deadline: deadline || null,
        requestId: finalRequestId,
      });
      setWhatsappDispatchUrl(waUrl);

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
            <div className="flex flex-wrap gap-2 pt-1">
              {whatsappEnabled && whatsappDispatchUrl && (
                <a
                  href={whatsappDispatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                  <span>Notify {designer.business_name} on WhatsApp</span>
                </a>
              )}
              <Link
                href="/requests"
                className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-2 bg-stone-900 text-white rounded-xl hover:bg-black transition-colors"
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

            {/* Fabric Material Preference */}
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

            {/* Do you have your own fabric? (Fabric Sourcing Arrangement) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-700" />
                  <span>Fabric Sourcing Arrangement <span className="text-red-500">*</span></span>
                </label>
                <p className="text-xs text-stone-600 mt-0.5">
                  Do you already have your fabric material ready, or should the designer source and buy it for you?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Client has fabric */}
                <button
                  type="button"
                  onClick={() => setFabricSourcing('client_provided')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    fabricSourcing === 'client_provided'
                      ? 'bg-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-white/60 border-stone-200 hover:border-amber-300 hover:bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    fabricSourcing === 'client_provided' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900">I Have My Own Fabric</span>
                      {fabricSourcing === 'client_provided' && (
                        <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-0.5 leading-snug">
                      I will send / courier my material (e.g. Aso Ebi) to the designer's studio. Quote will only cover tailoring workmanship.
                    </span>
                  </div>
                </button>

                {/* Option 2: Tailor sources fabric */}
                <button
                  type="button"
                  onClick={() => setFabricSourcing('tailor_sources')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    fabricSourcing === 'tailor_sources'
                      ? 'bg-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-white/60 border-stone-200 hover:border-amber-300 hover:bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    fabricSourcing === 'tailor_sources' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900">Tailor Should Source Fabric</span>
                      {fabricSourcing === 'tailor_sources' && (
                        <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-0.5 leading-snug">
                      The tailor will source premium fabric matching the design. Quote will include fabric cost + tailoring labor.
                    </span>
                  </div>
                </button>
              </div>
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

            {/* Optional Body Measurements Accordion */}
            <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/70 transition-all">
              <button
                type="button"
                onClick={() => setShowMeasurements(!showMeasurements)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                      Body Measurements <span className="text-stone-400 font-normal text-xs">(Optional)</span>
                    </span>
                    <span className="text-[11px] sm:text-xs text-stone-500 block">
                      Provide your fitting measurements in inches so the master tailor crafts your exact fit.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full border transition-all ${showMeasurements ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-stone-700 border-stone-300'}`}>
                    {showMeasurements ? 'Hide' : '+ Add Sizing'}
                  </span>
                  {showMeasurements ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>

              {showMeasurements && (
                <div className="p-4 sm:p-5 pt-1 space-y-4 border-t border-stone-200/80 animate-in fade-in duration-200">
                  
                  {/* Quick Select from Saved Vault */}
                  {vaultProfiles.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Load from My Measurement Vault</span>
                        </span>
                        <Link
                          href="/vault"
                          target="_blank"
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                        >
                          Manage Vault ↗
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedVaultProfileId}
                          onChange={(e) => {
                            const pId = e.target.value;
                            setSelectedVaultProfileId(pId);
                            const found = vaultProfiles.find((p) => p.id === pId);
                            if (found) {
                              setMeasurements((prev) => ({
                                ...prev,
                                chest: found.chest || '',
                                shoulder: found.shoulder || '',
                                sleeve: found.sleeve || '',
                                neck: found.neck || '',
                                waist: found.waist || '',
                                hips: found.hips || '',
                                top_length: found.top_length || '',
                                trouser_length: found.trouser_length || '',
                                thigh: found.thigh || '',
                                agbada_length: found.agbada_length || '',
                                fit_preference: found.fit_preference || 'regular',
                                notes: found.notes || '',
                              }));
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">-- Select Saved Profile to Auto-Fill --</option>
                          {vaultProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.profile_name} ({p.gender?.toUpperCase() || 'UNISEX'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Fit Preference */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Preferred Cut / Fit
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'slim', label: 'Slim Fit' },
                        { id: 'regular', label: 'Regular' },
                        { id: 'comfort', label: 'Comfort' },
                        { id: 'loose', label: 'Loose / Flow' },
                      ].map((fit) => (
                        <button
                          key={fit.id}
                          type="button"
                          onClick={() => setMeasurements((prev) => ({ ...prev, fit_preference: fit.id as any }))}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            measurements.fit_preference === fit.id
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {fit.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sizing Grid (Inches) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'chest', label: 'Chest / Bust (in)', placeholder: 'e.g. 42' },
                      { key: 'shoulder', label: 'Shoulder (in)', placeholder: 'e.g. 18.5' },
                      { key: 'sleeve', label: 'Sleeve Length (in)', placeholder: 'e.g. 25' },
                      { key: 'neck', label: 'Neck (in)', placeholder: 'e.g. 16' },
                      { key: 'waist', label: 'Waist (in)', placeholder: 'e.g. 34' },
                      { key: 'hips', label: 'Hips (in)', placeholder: 'e.g. 40' },
                      { key: 'top_length', label: 'Top / Kaftan (in)', placeholder: 'e.g. 38' },
                      { key: 'trouser_length', label: 'Trouser Length (in)', placeholder: 'e.g. 41' },
                      { key: 'thigh', label: 'Thigh / Lap (in)', placeholder: 'e.g. 24' },
                      { key: 'agbada_length', label: 'Agbada Flow (in)', placeholder: 'e.g. 52' },
                    ].map((item) => (
                      <div key={item.key}>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          {item.label}
                        </label>
                        <input
                          type="text"
                          value={(measurements as any)[item.key] || ''}
                          onChange={(e) =>
                            setMeasurements((prev) => ({ ...prev, [item.key]: e.target.value }))
                          }
                          placeholder={item.placeholder}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Fit Notes / Tailor Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={measurements.notes || ''}
                      onChange={(e) =>
                        setMeasurements((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="e.g. Broad shoulders, fitted cuffs for cufflinks, or high-waist cut"
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}
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
