'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NIGERIAN_STATES, STATE_AREAS, FASHION_CATEGORIES, UserRole } from '@/lib/types';
import { formatNigerianPhoneForInput } from '@/lib/phoneUtils';
import { triggerEmailNotification } from '@/lib/emailNotifications';
import { getAppBaseUrl } from '@/lib/appUrl';
import { Scissors, User, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [role, setRole] = useState<UserRole>('designer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Designer-specific fields across Nigeria
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedState, setSelectedState] = useState<string>('Lagos');
  const [area, setArea] = useState<string>(STATE_AREAS['Lagos'][0]);
  const [customArea, setCustomArea] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['native_wear', 'ankara']);
  const [whatsapp, setWhatsapp] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Handle state change: update available areas
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const availableAreas = STATE_AREAS[newState];
    if (availableAreas && availableAreas.length > 0) {
      setArea(availableAreas[0]);
    } else {
      setArea('General Area');
    }
  };

  const toggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== catId));
      }
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'designer') {
      if (!businessName.trim()) {
        setErrorMessage('Please enter your business or brand name.');
        return;
      }
      if (!bio.trim()) {
        setErrorMessage('Please tell us a little about your brand (Brand Intro).');
        return;
      }
    }

    setLoading(true);

    const finalArea = area === 'Other' || area.startsWith('Other')
      ? (customArea.trim() || area)
      : area;

    const designerDetails =
      role === 'designer'
        ? {
            businessName: businessName.trim(),
            bio: bio.trim(),
            state: selectedState,
            city: selectedState,
            area: finalArea,
            address: address.trim() || undefined,
            categories: selectedCategories,
            whatsapp: whatsapp.trim() || undefined,
          }
        : undefined;

    const { error, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      role,
      designerDetails
    );

    setLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Something went wrong during sign up. Please try again.');
    } else {
      // Send Welcome Email Notification
      try {
        const isDesigner = role === 'designer';
        const brandName = businessName.trim() || fullName.trim();
        const welcomeSubject = isDesigner
          ? `🌟 Welcome to Tailoram, ${brandName}! Your Fashion Studio is Live`
          : `✨ Welcome to Tailoram, ${fullName.trim()}! Connect with Top Nigerian Designers`;

        const welcomePreview = isDesigner
          ? `Welcome to Nigeria's premier bespoke fashion network! Your designer studio is ready. You can now showcase your portfolio of Agbada, Senator suits, Aso Ebi, or RTW garments, link your bank payout details to receive direct split payments, and accept custom commissions from clients across all 36 states and the diaspora.`
          : `Welcome to Tailoram! You now have direct access to Nigeria's master tailors and bespoke fashion houses. Commission custom Agbada, Kaftans, Senator suits, and Aso Ebi bridal wear, track your orders with verified milestones, and explore Ready-to-Wear styles.`;

        const ctaUrl = isDesigner
          ? `${getAppBaseUrl()}/dashboard`
          : `${getAppBaseUrl()}/shop`;

        triggerEmailNotification({
          event: 'welcome',
          recipientEmail: email.trim(),
          recipientName: fullName.trim(),
          subject: welcomeSubject,
          previewText: welcomePreview,
          ctaLink: ctaUrl,
          metadata: {
            role,
            business_name: isDesigner ? brandName : undefined,
            state: selectedState,
          },
        });
      } catch (emailErr) {
        console.warn('Welcome notification dispatch notice:', emailErr);
      }

      if (needsEmailConfirmation) {
        setSuccessNotice(
          'Account created successfully! Please check your email to confirm your account, then log in.'
        );
      } else {
        // Direct user according to role
        if (role === 'designer') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      }
    }
  };

  const availableAreas = STATE_AREAS[selectedState] || ['General / City Center', 'Other'];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-lagos-dark font-serif">
            Join Tailoram
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Connecting Nigerian fashion designers, tailors &amp; clients nationwide
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            I am joining as a:
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('designer')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                role === 'designer'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Scissors className="w-4 h-4 text-brand-600" />
              Tailor / Designer
            </button>

            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                role === 'client'
                  ? 'bg-white text-lagos-dark shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-4 h-4 text-brand-600" />
              Client
            </button>
          </div>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
              <p className="font-semibold">{successNotice}</p>
            </div>
            <Link
              href="/login"
              className="inline-block mt-2 font-bold text-emerald-700 underline text-xs"
            >
              Go to Login page &rarr;
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sign Up Form */}
        {!successNotice && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Babatunde Adeleke"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Designer specific fields */}
            {role === 'designer' && (
              <div className="pt-3 border-t border-stone-200 space-y-4">
                <div className="bg-brand-50/60 p-3 rounded-xl">
                  <p className="text-xs font-bold text-brand-800">
                    Fashion Brand Details
                  </p>
                  <p className="text-[11px] text-stone-600">
                    Tell clients across Nigeria where you operate and what you make.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Brand / Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Seyi Stitches & Couture"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Tell Us About Your Brand (Brand Intro) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-medium">
                      Public Profile &amp; Search
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Master bespoke tailoring brand in Lagos specializing in luxury Agbada, Senator suits, and sharp corporate tuxedos. Over 8 years of artisan craft with precise fittings and nationwide delivery."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder:text-stone-400 leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Tell clients what makes your tailoring stand out, your signature garments, and specialties.
                  </p>
                </div>

                {/* State & City/Area Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                {/* If selected Other or custom */}
                {(area.startsWith('Other') || area === 'General / City Center') && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Specific Neighborhood Name
                    </label>
                    <input
                      type="text"
                      value={customArea}
                      onChange={(e) => setCustomArea(e.target.value)}
                      placeholder="e.g. Bodija, GRA Phase 2, etc."
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                {/* Full Physical Business Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Full Studio / Business Address
                    </label>
                    <span className="text-[10px] text-stone-400">
                      Physical studio/shop location
                    </span>
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Suite 4, Admiralty Way, Lekki Phase 1 / 14 Allen Avenue, Ikeja"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Helps clients locate your showroom, fitting studio, or workshop for in-person fittings and fabric drops.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      WhatsApp Number (Optional)
                    </label>
                    <span className="text-[10px] text-stone-400 font-medium">
                      Auto-formats to +234
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatNigerianPhoneForInput(e.target.value))}
                    placeholder="+234 801 234 5678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Enter local number (e.g. 080...); country code is added automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Your Specialties / Categories
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FASHION_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-brand-600/20"
            >
              {loading ? (
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>Create {role === 'designer' ? 'Tailor' : 'Client'} Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer link to Login */}
        <p className="text-center text-xs text-stone-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Log in here
          </Link>
        </p>

      </div>
    </div>
  );
}
