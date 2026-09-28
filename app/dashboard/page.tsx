'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';
import {
  PortfolioItem,
  NIGERIAN_STATES,
  STATE_AREAS,
  FASHION_CATEGORIES,
} from '@/lib/types';
import {
  Scissors,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Save,
  MapPin,
  Phone,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function DesignerDashboard() {
  const router = useRouter();
  const { user, profile, designerProfile, refreshProfile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'portfolio' | 'profile'>('portfolio');

  // Portfolio items state
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Upload modal & form state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile state
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [area, setArea] = useState('Ikeja');
  const [whatsapp, setWhatsapp] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Delete item state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Populate profile fields when designerProfile loads
  useEffect(() => {
    if (designerProfile) {
      setBusinessName(designerProfile.business_name || '');
      setBio(designerProfile.bio || '');
      setSelectedState(designerProfile.state || 'Lagos');
      setArea(designerProfile.area || 'Ikeja');
      setWhatsapp(designerProfile.whatsapp || '');
      setCategories(designerProfile.categories || ['native_wear']);
    }
  }, [designerProfile]);

  // Load portfolio items
  const loadPortfolio = async (designerId: string) => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading portfolio:', error);
      } else {
        setItems(data as PortfolioItem[]);
      }
    } catch (err) {
      console.error('Failed to load portfolio items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (designerProfile?.id) {
      loadPortfolio(designerProfile.id);
    }
  }, [user, designerProfile, authLoading, router]);

  // Handle state change for area list
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const available = STATE_AREAS[newState];
    if (available && available.length > 0) {
      setArea(available[0]);
    } else {
      setArea('General Area');
    }
  };

  // Toggle category pills
  const toggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== catId));
      }
    } else {
      setCategories([...categories, catId]);
    }
  };

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload Portfolio Item
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a photo or short video to upload.');
      return;
    }
    if (!designerProfile?.id) {
      setUploadError('Designer profile not found. Please refresh and try again.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      setUploadSuccess('');

      const isVideo = uploadFile.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // 1. Client-side compress images to save mobile data
      let finalFile: File = uploadFile;
      if (!isVideo) {
        finalFile = await compressImage(uploadFile, 1400, 1400, 0.82);
      }

      // 2. Generate clean storage filename
      const fileExt = finalFile.name.split('.').pop() || (isVideo ? 'mp4' : 'webp');
      const fileName = `${designerProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      // 3. Upload to Supabase Storage 'portfolio' bucket
      const { error: storageError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, finalFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (storageError) {
        // Provide friendly message if bucket doesn't exist
        if (storageError.message.includes('Bucket not found')) {
          throw new Error(
            'The "portfolio" storage bucket has not been created yet in Supabase. Please go to Supabase Dashboard -> Storage -> Create new bucket named "portfolio" (Public: Yes).'
          );
        }
        throw storageError;
      }

      // 4. Retrieve public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('portfolio').getPublicUrl(fileName);

      // 5. Insert record into portfolio_items table
      const { error: dbError } = await supabase.from('portfolio_items').insert([
        {
          designer_id: designerProfile.id,
          media_url: publicUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
        },
      ]);

      if (dbError) throw dbError;

      // 6. Reset form & refresh list
      setUploadSuccess('Portfolio item added successfully!');
      setUploadFile(null);
      setPreviewUrl(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await loadPortfolio(designerProfile.id);
      
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccess('');
      }, 1200);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Portfolio Item
  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      setDeletingId(item.id);

      // Delete from database
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      // Try deleting from storage (extract path from URL)
      try {
        const parts = item.media_url.split('/portfolio/');
        if (parts.length > 1) {
          const storagePath = parts[1];
          await supabase.storage.from('portfolio').remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn('Could not remove file from storage:', storageErr);
      }

      setItems(items.filter((i) => i.id !== item.id));
    } catch (err: any) {
      alert(`Could not delete item: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Save Profile Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerProfile?.id) return;

    try {
      setSavingProfile(true);
      setProfileSuccess('');
      setProfileError('');

      const { error } = await supabase
        .from('designer_profiles')
        .update({
          business_name: businessName.trim(),
          bio: bio.trim() || null,
          state: selectedState,
          city: selectedState,
          area: area,
          whatsapp: whatsapp.trim() || null,
          categories: categories,
        })
        .eq('id', designerProfile.id);

      if (error) throw error;

      await refreshProfile();
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm font-medium">Loading your designer dashboard...</p>
        </div>
      </div>
    );
  }

  const availableAreas = STATE_AREAS[selectedState] || ['General / City Center', 'Other'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-100 text-brand-800">
              Designer Studio
            </span>
            <span className="flex items-center gap-1 text-xs text-stone-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              {designerProfile?.area || 'Lagos'}, {designerProfile?.state || 'Nigeria'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-lagos-dark font-serif">
            {designerProfile?.business_name || profile?.full_name || 'My Tailor Brand'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Manage your fashion catalog, update your specialties, and showcase your best crafts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {designerProfile && (
            <Link
              href={`/designer/${designerProfile.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs sm:text-sm font-semibold transition-all shadow-sm"
            >
              <Eye className="w-4 h-4 text-brand-600" />
              Preview Public Profile
            </Link>
          )}

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            Upload New Work
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-8">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'portfolio'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Portfolio Gallery ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'profile'
              ? 'text-brand-700 border-b-2 border-brand-600'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Edit Brand Profile
        </button>
      </div>

      {/* TAB 1: PORTFOLIO GALLERY */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {loadingItems ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-sm">Loading your portfolio collection...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-lagos-dark font-serif">
                  Your portfolio is empty
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Upload photos and short clips of your recent outfits (Ankara, Senator suits, Owambe styles) so clients can see your craftsmanship.
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload First Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                    {item.media_type === 'video' ? (
                      <video
                        src={item.media_url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.caption || 'Tailor work'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    
                    {/* Media type badge */}
                    <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {item.media_type === 'video' ? (
                        <>
                          <Video className="w-3 h-3" /> Video
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3 h-3" /> Photo
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs sm:text-sm text-stone-800 font-medium line-clamp-2">
                      {item.caption || 'Custom tailored creation'}
                    </p>

                    <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      
                      <button
                        onClick={() => handleDeleteItem(item)}
                        disabled={deletingId === item.id}
                        className="text-stone-400 hover:text-red-600 transition-colors p-1"
                        title="Delete item"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-lagos-dark font-serif">
                Brand Profile Details
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                This information helps clients across Nigeria find you and reach out for custom orders.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Business / Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Ade Bespoke & Stitches"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* State and Area mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  State in Nigeria <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Area / Neighborhood <span className="text-red-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Bio / About Your Brand
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your tailoring background, materials you work best with (Ankara, Senegalese, Cashmere, Brocade), and average turnaround time..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Specialties &amp; Outfit Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {FASHION_CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Updates...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-lagos-dark font-serif flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Upload Portfolio Work
              </h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFile(null);
                  setPreviewUrl(null);
                  setUploadError('');
                }}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Media Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Choose Photo or Short Video <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Photos are automatically compressed to WebP for fast Nigerian mobile loading.
                </p>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="aspect-[4/3] bg-stone-100 rounded-xl overflow-hidden relative border border-stone-200">
                  {uploadFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Caption / Style Description
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. 3-piece Royal Agbada with custom embroidery"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compressing &amp; Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
