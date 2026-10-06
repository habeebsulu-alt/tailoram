'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ClientMeasurements } from '@/lib/types';
import {
  getMeasurementVault,
  saveMeasurementProfile,
  deleteMeasurementProfile,
  encodeMeasurementShareToken,
  decodeMeasurementShareToken,
  DEFAULT_MEASUREMENT_PROFILES,
} from '@/lib/measurementVault';
import { getAppBaseUrl } from '@/lib/appUrl';
import {
  Ruler,
  Plus,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit3,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  Scissors,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react';

function MeasurementVaultContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sharedParam = searchParams.get('shared');

  const [profiles, setProfiles] = useState<ClientMeasurements[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<ClientMeasurements | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareModalProfile, setShareModalProfile] = useState<ClientMeasurements | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Expanded fields state in form
  const [showAdvanced, setShowAdvanced] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function loadVault() {
      setLoading(true);
      const list = await getMeasurementVault(user?.id);
      
      // If opened via a shared link, decode and offer to import
      if (sharedParam) {
        const decoded = decodeMeasurementShareToken(sharedParam);
        if (decoded) {
          // Check if already in list
          const exists = list.some((p) => p.profile_name === decoded.profile_name && p.chest === decoded.chest);
          if (!exists) {
            setEditingProfile({ ...decoded, id: undefined });
            setIsCreatingNew(true);
            showToast('Loaded shared measurement profile! Click "Save to My Vault" below.');
          }
        }
      }

      setProfiles(list);
      setLoading(false);
    }
    loadVault();
  }, [user, sharedParam]);

  const handleCreateNew = (gender: 'male' | 'female' = 'male') => {
    setEditingProfile({
      profile_name: gender === 'male' ? 'My Agbada / Senator Fit' : 'My Aso Ebi / Gown Fit',
      gender,
      unit: 'in',
      fit_preference: 'regular',
    });
    setIsCreatingNew(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.profile_name?.trim()) {
      alert('Please enter a name for this measurement profile.');
      return;
    }

    const saved = await saveMeasurementProfile(editingProfile, user?.id);
    const updatedList = await getMeasurementVault(user?.id);
    setProfiles(updatedList);
    setEditingProfile(null);
    setIsCreatingNew(false);
    showToast('Measurement profile saved successfully!');
  };

  const handleDeleteProfile = async (id?: string) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this measurement profile?')) {
      await deleteMeasurementProfile(id, user?.id);
      const updatedList = await getMeasurementVault(user?.id);
      setProfiles(updatedList);
      showToast('Profile removed from vault.');
    }
  };

  const handleOpenShare = (profile: ClientMeasurements) => {
    const token = encodeMeasurementShareToken(profile);
    const url = `${getAppBaseUrl()}/vault?shared=${token}`;
    setShareUrl(url);
    setShareModalProfile(profile);
  };

  const handleCopyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId('share_url');
    setTimeout(() => setCopiedId(null), 2500);
    showToast('Link copied! Anyone with this link can view or import these measurements.');
  };

  const handleCopyTextCard = (p: ClientMeasurements) => {
    const lines = [
      `📐 Tailoram Measurement Profile: ${p.profile_name} (${(p.gender || 'unisex').toUpperCase()})`,
      p.chest ? `• Chest / Bust: ${p.chest} in` : null,
      p.underbust ? `• Underbust: ${p.underbust} in` : null,
      p.shoulder ? `• Shoulder: ${p.shoulder} in` : null,
      p.sleeve ? `• Sleeve Length: ${p.sleeve} in` : null,
      p.round_sleeve ? `• Bicep / Muscle: ${p.round_sleeve} in` : null,
      p.cuff_wrist ? `• Cuff / Wrist: ${p.cuff_wrist} in` : null,
      p.neck ? `• Neck: ${p.neck} in` : null,
      p.top_length ? `• Top / Kaftan Length: ${p.top_length} in` : null,
      p.shoulder_to_waist ? `• Shoulder to Waist: ${p.shoulder_to_waist} in` : null,
      p.shoulder_to_floor ? `• Shoulder to Floor: ${p.shoulder_to_floor} in` : null,
      p.waist ? `• Waist: ${p.waist} in` : null,
      p.hips ? `• Hips: ${p.hips} in` : null,
      p.thigh ? `• Thigh / Lap: ${p.thigh} in` : null,
      p.trouser_length ? `• Trouser Length: ${p.trouser_length} in` : null,
      p.ankle ? `• Ankle / Hem: ${p.ankle} in` : null,
      p.agbada_length ? `• Agbada Flow: ${p.agbada_length} in` : null,
      p.head_circumference ? `• Fila / Cap Size: ${p.head_circumference} in` : null,
      p.fit_preference ? `• Cut / Fit Preference: ${p.fit_preference.toUpperCase()}` : null,
      p.notes ? `• Special Instructions: "${p.notes}"` : null,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(p.id || 'card');
    setTimeout(() => setCopiedId(null), 2500);
    showToast('Measurements text card copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/requests"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Orders</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30 hover:bg-amber-500/20 transition-all"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Browse Master Designers</span>
          </Link>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-sm flex items-center gap-2.5 animate-in fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="font-medium">{toastMessage}</p>
          </div>
        )}

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Ruler className="w-3.5 h-3.5" />
                <span>Nigerian Bespoke Sizing Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                My Measurement Profiles
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                Store your exact body dimensions once in inches. Attach them in 1-click when commissioning bespoke Agbada, Senator suits, Kaftans, and Aso Ebi gowns, or generate a sharable link for your tailors.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCreateNew('male')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Men's Fit</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateNew('female')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition-all border border-stone-700 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Women's Fit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal / Inline Editor */}
        {editingProfile && (
          <div className="bg-stone-950 p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isCreatingNew ? 'Create New Measurement Profile' : `Edit "${editingProfile.profile_name}"`}
                  </h3>
                  <p className="text-xs text-stone-400">
                    All numeric fields are measured in inches.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-stone-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Profile Name & Gender Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Profile Label / Title <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProfile.profile_name || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, profile_name: e.target.value })}
                    placeholder="e.g. My Agbada & Native Wear, Owambe Corset Fit, Hubby Senator..."
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Garment Silhouette
                  </label>
                  <select
                    value={editingProfile.gender || 'male'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, gender: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="male">Men's Native / Agbada / Senator</option>
                    <option value="female">Women's Aso Ebi / Corset / Gown</option>
                    <option value="unisex">Unisex / Contemporary</option>
                  </select>
                </div>
              </div>

              {/* Fit Preference Pills */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Preferred Fit Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'slim', label: 'Slim Fit' },
                    { id: 'regular', label: 'Regular' },
                    { id: 'comfort', label: 'Comfort Fit' },
                    { id: 'loose', label: 'Flowing / Loose' },
                  ].map((fit) => (
                    <button
                      key={fit.id}
                      type="button"
                      onClick={() => setEditingProfile({ ...editingProfile, fit_preference: fit.id as any })}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editingProfile.fit_preference === fit.id
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {fit.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upper Body Measurements */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upper Body Dimensions (Inches)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'chest', label: editingProfile.gender === 'female' ? 'Bust (in)' : 'Chest (in)', ph: '42' },
                    ...(editingProfile.gender === 'female' ? [{ key: 'underbust', label: 'Underbust (in)', ph: '32' }] : []),
                    { key: 'shoulder', label: 'Shoulder Width (in)', ph: '19' },
                    { key: 'sleeve', label: 'Sleeve Length (in)', ph: '26' },
                    { key: 'round_sleeve', label: 'Bicep / Armhole (in)', ph: '15' },
                    { key: 'cuff_wrist', label: 'Wrist / Cuff (in)', ph: '8.5' },
                    { key: 'neck', label: 'Neck (in)', ph: '16.5' },
                    { key: 'top_length', label: 'Top / Kaftan Length (in)', ph: '38' },
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={(editingProfile as any)[item.key] || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, [item.key]: e.target.value })}
                        placeholder={item.ph}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Lower Body Measurements */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lower Body &amp; Trousers / Skirts (Inches)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'waist', label: 'Waist (in)', ph: '34' },
                    { key: 'hips', label: 'Hips / Seat (in)', ph: '41' },
                    { key: 'thigh', label: 'Thigh / Lap (in)', ph: '24' },
                    { key: 'trouser_length', label: 'Trouser / Skirt Length (in)', ph: '41' },
                    { key: 'knee', label: 'Knee (in)', ph: '18' },
                    { key: 'ankle', label: 'Ankle / Hem (in)', ph: '14' },
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={(editingProfile as any)[item.key] || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, [item.key]: e.target.value })}
                        placeholder={item.ph}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nigerian Bespoke Specials */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <span>Traditional Nigerian Attire Specials (Agbada Flow, Fila Cap, Corset Heights)</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-stone-900 border border-stone-800 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        Agbada Flow Length (in)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.agbada_length || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, agbada_length: e.target.value })}
                        placeholder="52"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        Fila Cap Size / Head (in)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.head_circumference || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, head_circumference: e.target.value })}
                        placeholder="22.5"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        Shoulder to Waist (in)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.shoulder_to_waist || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, shoulder_to_waist: e.target.value })}
                        placeholder="16"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-400 mb-1">
                        Shoulder to Floor (in)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.shoulder_to_floor || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, shoulder_to_floor: e.target.value })}
                        placeholder="59"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fit Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Fitting Notes &amp; Artisan Instructions
                </label>
                <textarea
                  rows={3}
                  value={editingProfile.notes || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, notes: e.target.value })}
                  placeholder="e.g. Athletic shoulders with slight right slope; prefers deep side pockets on kaftan; needs trousers cut high-waisted for native agbada drape..."
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Save Measurement Profile
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Saved Profiles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-stone-400">
              Saved Profiles ({profiles.length})
            </h2>
            <span className="text-xs text-stone-500">
              {user ? 'Synced to your Tailoram account' : 'Saved in this browser'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-500">
              <Ruler className="w-8 h-8 mx-auto animate-bounce text-amber-500/50 mb-2" />
              <p className="text-xs">Loading measurements vault...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-stone-950 border border-stone-800 space-y-4">
              <Ruler className="w-12 h-12 text-stone-600 mx-auto" />
              <div>
                <h4 className="font-bold text-stone-200">No Measurement Profiles Yet</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Create your first fitting profile so you never have to re-type measurements when commissioning Nigerian tailors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCreateNew('male')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-black text-xs cursor-pointer"
              >
                + Create First Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {profiles.map((p) => {
                const metricEntries: { label: string; val?: string }[] = [
                  { label: p.gender === 'female' ? 'Bust' : 'Chest', val: p.chest },
                  { label: 'Shoulder', val: p.shoulder },
                  { label: 'Sleeve', val: p.sleeve },
                  { label: 'Neck', val: p.neck },
                  { label: 'Kaftan', val: p.top_length },
                  { label: 'Waist', val: p.waist },
                  { label: 'Hips', val: p.hips },
                  { label: 'Trouser', val: p.trouser_length },
                  { label: 'Agbada', val: p.agbada_length },
                ].filter((item) => Boolean(item.val));

                return (
                  <div
                    key={p.id || p.profile_name}
                    className="p-5 sm:p-6 rounded-3xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div className="space-y-3">
                      {/* Top bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-white group-hover:text-amber-400 transition-colors">
                              {p.profile_name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-400">
                              {p.gender || 'unisex'}
                            </span>
                            {p.fit_preference && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {p.fit_preference} fit
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenShare(p)}
                            title="Share measurements link with tailor"
                            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-800 transition-all cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfile(p);
                              setIsCreatingNew(false);
                            }}
                            title="Edit measurements"
                            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(p.id)}
                            title="Delete profile"
                            className="p-2 rounded-xl bg-stone-900 hover:bg-red-950/40 text-stone-500 hover:text-red-400 border border-stone-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dimensions Pills Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {metricEntries.slice(0, 6).map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800/80 text-center"
                          >
                            <span className="text-[10px] font-medium text-stone-500 block uppercase">
                              {m.label}
                            </span>
                            <span className="text-sm font-black text-white">
                              {m.val}"
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Notes snippet */}
                      {p.notes && (
                        <p className="text-xs text-stone-400 line-clamp-2 italic bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/50">
                          "{p.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyTextCard(p)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        {copiedId === p.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-400" />
                            <span>Copy Card</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenShare(p)}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Get Share Link →</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Share Modal Dialog */}
      {shareModalProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setShareModalProfile(null)}
        >
          <div
            className="bg-stone-950 border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">
                    Share Measurement Profile
                  </h4>
                  <p className="text-xs text-stone-400">
                    {shareModalProfile.profile_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalProfile(null)}
                className="text-stone-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Send this link to your tailor via WhatsApp or chat. They can open it directly to view your exact dimensions or import them into their studio workflow.
            </p>

            <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-stone-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shrink-0 cursor-pointer"
              >
                {copiedId === 'share_url' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hello! Here are my tailoring measurements from Tailoram for ${shareModalProfile.profile_name}:\n\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Share via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShareModalProfile(null)}
                className="w-full py-2.5 text-xs text-stone-400 hover:text-white font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MeasurementVaultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-900 flex items-center justify-center p-8 text-stone-400">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading Sizing Vault...</span>
          </div>
        </div>
      }
    >
      <MeasurementVaultContent />
    </Suspense>
  );
}
