'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { DesignerProfile, PORTFOLIO_STYLE_CATEGORIES } from '@/lib/types';
import { compressImage, compressAvatarImage, isValidImageFile, prepareImageFile } from '@/lib/imageCompressor';
import { getAppBaseUrl } from '@/lib/appUrl';
import {
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  X,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Scissors,
  Layers,
  Info,
  Clock,
  Eye,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface DesignerWorksOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  designerProfile: DesignerProfile;
  onWorksUploaded?: () => Promise<void> | void;
  onAvatarUpdated?: (newUrl: string) => void;
}

interface StagedWork {
  id: string;
  file: File;
  previewUrl: string;
  category: string;
  caption: string;
}

interface UploadedWorkSummary {
  id: string;
  media_url: string;
  caption?: string | null;
  category?: string | null;
}

export default function DesignerWorksOnboardingModal({
  isOpen,
  onClose,
  designerProfile,
  onWorksUploaded,
  onAvatarUpdated,
}: DesignerWorksOnboardingModalProps) {
  // Steps: 1 = Studio Logo, 2 = Upload Attire Works, 3 = Celebrate & Share
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Logo / Profile Picture
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(
    designerProfile.profile_image_url || ''
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Portfolio Works Upload
  const [selectedCategory, setSelectedCategory] = useState<string>('agbada');
  const [defaultCaption, setDefaultCaption] = useState<string>('');
  const [stagedWorks, setStagedWorks] = useState<StagedWork[]>([]);
  const [isUploadingWorks, setIsUploadingWorks] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [worksError, setWorksError] = useState('');
  const [uploadedWorks, setUploadedWorks] = useState<UploadedWorkSummary[]>([]);
  const worksInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Celebration & Sharing
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync initial avatar when designerProfile changes
  useEffect(() => {
    if (designerProfile.profile_image_url && !logoPreviewUrl) {
      setLogoPreviewUrl(designerProfile.profile_image_url);
    }
  }, [designerProfile.profile_image_url, logoPreviewUrl]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      stagedWorks.forEach((item) => {
        if (item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [stagedWorks]);

  if (!isOpen) return null;

  const publicProfileUrl = `${getAppBaseUrl()}/designer/${designerProfile.id}`;

  // ==========================================
  // STEP 1 HANDLERS: LOGO / PROFILE PICTURE
  // ==========================================
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    setLogoSuccess('');
    if (!e.target.files || !e.target.files[0]) return;

    const rawFile = e.target.files[0];
    if (!isValidImageFile(rawFile)) {
      setLogoError('Please choose a valid photo (.jpg, .png, .webp, .heic).');
      return;
    }

    try {
      setLogoUploading(true);
      const normalizedFile = await prepareImageFile(rawFile);
      const compressed = await compressAvatarImage(normalizedFile, 800, 0.92);
      setLogoFile(compressed);

      const localBlob = URL.createObjectURL(compressed);
      setLogoPreviewUrl(localBlob);

      // Perform instant AJAX upload to Supabase storage
      const fileName = `avatars/${designerProfile.id}-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, compressed, {
          cacheControl: '31536000',
          upsert: true,
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('portfolio').getPublicUrl(fileName);

      // Persist to designer_profiles
      await supabase
        .from('designer_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', designerProfile.id);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`tailoram_avatar_${designerProfile.id}`, publicUrl);
      }

      if (onAvatarUpdated) {
        onAvatarUpdated(publicUrl);
      }

      setLogoSuccess('Studio logo saved successfully!');
    } catch (err: any) {
      console.error('Error saving logo:', err);
      setLogoError(err.message || 'Could not upload logo. You can skip this step and try again later.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // ==========================================
  // STEP 2 HANDLERS: OUTFITS / WORKS UPLOAD
  // ==========================================
  const handleWorksSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorksError('');
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const validFiles: StagedWork[] = [];

    for (const rawFile of files) {
      if (!isValidImageFile(rawFile)) continue;
      try {
        const normalized = await prepareImageFile(rawFile);
        const previewUrl = URL.createObjectURL(normalized);
        validFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file: normalized,
          previewUrl,
          category: selectedCategory,
          caption: defaultCaption.trim() || '',
        });
      } catch (err) {
        console.warn('Could not prepare image file:', err);
      }
    }

    if (validFiles.length === 0) {
      setWorksError('No valid image files found. Please select .jpg, .png, .webp, or .heic files.');
      return;
    }

    setStagedWorks((prev) => [...prev, ...validFiles]);
    if (worksInputRef.current) worksInputRef.current.value = '';
  };

  const removeStagedWork = (id: string) => {
    setStagedWorks((prev) => {
      const target = prev.find((w) => w.id === id);
      if (target && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((w) => w.id !== id);
    });
  };

  const updateStagedWorkCaption = (id: string, caption: string) => {
    setStagedWorks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, caption } : w))
    );
  };

  const updateStagedWorkCategory = (id: string, category: string) => {
    setStagedWorks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, category } : w))
    );
  };

  // Submit all staged works via AJAX
  const handleUploadStagedWorks = async () => {
    if (stagedWorks.length === 0) {
      setWorksError('Please select at least one outfit photo to upload.');
      return;
    }

    try {
      setIsUploadingWorks(true);
      setWorksError('');

      const total = stagedWorks.length;
      const newItemsToInsert: any[] = [];
      const uploadedSummaries: UploadedWorkSummary[] = [];

      for (let i = 0; i < total; i++) {
        const item = stagedWorks[i];
        setUploadProgressText(
          total > 1
            ? `Compressing and uploading outfit ${i + 1} of ${total}...`
            : 'Compressing and uploading outfit photo...'
        );

        // Fast WebP compression to ~150-200KB
        const compressedFile = await compressImage(item.file, 1400, 1400, 0.82);
        const fileName = `${designerProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;

        const { error: storageError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, compressedFile, {
            cacheControl: '31536000',
            upsert: true,
            contentType: 'image/webp',
          });

        if (storageError) throw storageError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('portfolio').getPublicUrl(fileName);

        const newRow = {
          designer_id: designerProfile.id,
          media_url: publicUrl,
          media_type: 'image',
          caption: item.caption.trim() || null,
          category: item.category || 'native_wear',
        };

        newItemsToInsert.push(newRow);
        uploadedSummaries.push({
          id: Math.random().toString(36).substring(2, 9),
          media_url: publicUrl,
          caption: item.caption.trim() || null,
          category: item.category || 'native_wear',
        });
      }

      setUploadProgressText('Publishing outfits to your studio catalog...');
      const { data: insertedData, error: dbError } = await supabase
        .from('portfolio_items')
        .insert(newItemsToInsert)
        .select();

      if (dbError) throw dbError;

      // Update local state
      setUploadedWorks((prev) => [
        ...prev,
        ...(insertedData || uploadedSummaries),
      ]);
      setStagedWorks([]);

      // Notify parent to refresh dashboard items
      if (onWorksUploaded) {
        await onWorksUploaded();
      }

      // Automatically advance to Step 3 celebration
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Failed to upload works:', err);
      setWorksError(err.message || 'Failed to upload works. Please try again.');
    } finally {
      setIsUploadingWorks(false);
      setUploadProgressText('');
    }
  };

  // ==========================================
  // STEP 3 HANDLERS: CELEBRATION & SHARE
  // ==========================================
  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicProfileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const brandName = designerProfile.business_name || 'My Fashion Studio';
    const msg = `Good day! 🌟 Check out my bespoke fashion portfolio and latest tailored designs on Tailoram: ${publicProfileUrl}\n\nYou can commission custom Agbada, Senator suits, Native wear, and Aso Ebi directly with verified milestones!`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `tailoram_designer_works_dismissed_${designerProfile.id}`,
        Date.now().toString()
      );
      localStorage.removeItem('tailoram_designer_onboarding_pending');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-stone-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-stone-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header with Step Tracker */}
        <div className="px-5 sm:px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Studio Launch Guide
                </span>
                <span className="text-xs text-stone-400 font-semibold">
                  Step {currentStep} of 3
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {currentStep === 1 && 'Step 1: Add Your Studio Identity'}
                {currentStep === 2 && 'Step 2: Upload Photos of Your Best Attire'}
                {currentStep === 3 && '🎉 Your Studio is Live on Tailoram!'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Step Indicator Bar */}
        <div className="grid grid-cols-3 bg-stone-950/80 border-b border-stone-800/80 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              currentStep === 1
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-[10px]">
              1
            </span>
            <span className="hidden sm:inline">Studio Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              currentStep === 2
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-[10px]">
              2
            </span>
            <span className="hidden sm:inline">Upload Outfits</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              currentStep === 3
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-[10px]">
              3
            </span>
            <span className="hidden sm:inline">Go Live &amp; Share</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[72vh] space-y-6">
          {/* ==================================================== */}
          {/* STEP 1: STUDIO LOGO & AVATAR                         */}
          {/* ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center sm:text-left space-y-1.5">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Add Your Studio Logo or Profile Headshot
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  Show clients in Lagos, Abuja, and abroad that you run a reputable atelier. Studios with a logo look 10x more trustworthy and receive priority placement.
                </p>
              </div>

              {/* Logo / Avatar Dropzone */}
              <div className="p-6 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-stone-800 border-2 border-amber-500/50 flex items-center justify-center shadow-xl">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Studio Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-500 gap-1">
                        <Camera className="w-8 h-8 text-amber-400/80" />
                        <span className="text-[10px] font-bold">Add Logo</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg cursor-pointer transition-transform hover:scale-105"
                    title="Choose photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      {designerProfile.business_name || 'Your Fashion Atelier'}
                    </h4>
                    <p className="text-xs text-stone-400">
                      Recommended: High-resolution square logo (.png, .jpg, .webp, .heic). Max 25MB.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoSelect}
                      accept="image/*,.heic,.heif"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoUploading ? 'Saving Logo...' : logoPreviewUrl ? 'Change Logo Photo' : 'Upload Studio Logo'}</span>
                    </button>

                    {logoPreviewUrl && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Logo Saved</span>
                      </span>
                    )}
                  </div>

                  {logoSuccess && (
                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {logoSuccess}
                    </p>
                  )}
                  {logoError && (
                    <p className="text-xs text-rose-400 font-medium">{logoError}</p>
                  )}
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-4 border-t border-stone-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Skip Logo for Now →
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Upload Outfits</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: SHOWCASE ATTIRE / UPLOAD WORKS               */}
          {/* ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center sm:text-left space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Upload Photos of Your Best Attire
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                    High Conversion
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  Nigerian clients hire tailors by looking at past stitches. Add at least 1 to 3 of your proudest Agbada, Senator suits, Ankara, Aso Ebi, or Bridal works.
                </p>
              </div>

              {/* Garment Category Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Select Primary Category for this Upload:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'agbada', label: 'Agbada & Senegalese' },
                    { id: 'senator', label: 'Senator & Kaftan' },
                    { id: 'aso_ebi', label: 'Aso Ebi & Owambe' },
                    { id: 'ankara', label: 'Ankara Prints' },
                    { id: 'bridal', label: 'Bridal Gowns' },
                    { id: 'ready_to_wear', label: 'Ready-to-Wear (RTW)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-amber-500 text-stone-950 shadow-md font-black scale-102'
                          : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700/80 border border-stone-700/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag & Drop / Tap Upload Box */}
              <input
                type="file"
                ref={worksInputRef}
                onChange={handleWorksSelect}
                multiple
                accept="image/*,.heic,.heif"
                className="hidden"
              />

              <div
                onClick={() => worksInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-stone-950/60 hover:bg-stone-950/90 transition-all flex flex-col items-center justify-center text-center cursor-pointer group space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Tap to Choose Photos from Phone Gallery or Camera
                  </p>
                  <p className="text-xs text-stone-400">
                    Supports multiple photos at once. Automatic high-speed WebP compression.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-stone-800 text-amber-300 text-[11px] font-bold">
                  + Select Outfit Photos
                </span>
              </div>

              {/* Staged Photos Preview Grid (Before submitting) */}
              {stagedWorks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-300 uppercase tracking-wider">
                      Ready to Upload ({stagedWorks.length} outfit{stagedWorks.length > 1 ? 's' : ''}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setStagedWorks([])}
                      className="text-[11px] text-stone-400 hover:text-rose-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stagedWorks.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 flex flex-col group shadow-lg"
                      >
                        <div className="aspect-[3/4] relative bg-stone-900">
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="w-full h-full object-cover object-top"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStagedWork(item.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-stone-950/80 text-[10px] font-extrabold text-amber-300">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="p-2 space-y-1 bg-stone-950">
                          <input
                            type="text"
                            placeholder="Outfit title / caption (optional)"
                            value={item.caption}
                            onChange={(e) => updateStagedWorkCaption(item.id, e.target.value)}
                            className="w-full text-[11px] bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadStagedWorks}
                    disabled={isUploadingWorks}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-stone-950" />
                    <span>
                      {isUploadingWorks
                        ? uploadProgressText || 'Uploading Outfits...'
                        : `Publish ${stagedWorks.length} Outfit${stagedWorks.length > 1 ? 's' : ''} to Studio Portfolio →`}
                    </span>
                  </button>
                </div>
              )}

              {/* Already Uploaded Works Summary */}
              {uploadedWorks.length > 0 && stagedWorks.length === 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadedWorks.length} outfit{uploadedWorks.length > 1 ? 's' : ''} successfully published to your studio!</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {uploadedWorks.map((work) => (
                      <div key={work.id} className="w-14 h-18 rounded-xl overflow-hidden shrink-0 border border-emerald-500/30">
                        <img src={work.media_url} alt="" className="w-full h-full object-cover object-top" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {worksError && (
                <p className="text-xs text-rose-400 font-medium">{worksError}</p>
              )}

              {/* Step 2 Actions */}
              <div className="pt-4 border-t border-stone-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  I'll upload works later
                </button>

                {uploadedWorks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Finish &amp; Share Studio →</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => worksInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Select Outfits from Phone</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: CELEBRATION & WHATSAPP SHARING               */}
          {/* ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                  Studio Active &amp; Verified
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white font-serif">
                  Congratulations, {designerProfile.business_name || 'Master Tailor'}!
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium">
                  Your bespoke atelier is now listed on Tailoram marketplace. Clients in Nigeria and the diaspora can view your outfits and commission custom garments.
                </p>
              </div>

              {/* Public Profile Link Box */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-left space-y-2">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Your Public Studio Link:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-amber-300 font-mono truncate select-all">
                    {publicProfileUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WhatsApp Launch & Enter Dashboard Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Share My Studio on WhatsApp</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={publicProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-stone-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Public Profile</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <span>Enter Studio Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
