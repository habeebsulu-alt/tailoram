'use client';

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Twitter,
  Send,
  QrCode,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  designerName: string;
  url: string;
  description?: string;
  location?: string;
  categories?: string[];
  imageUrl?: string | null;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  designerName,
  url,
  description,
  location,
  categories,
  imageUrl,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const defaultShareText = `Discover ${designerName} on Tailoram - Nigeria's premier bespoke fashion marketplace. View portfolio & commission custom attire:`;
  const encodedText = encodeURIComponent(defaultShareText);
  const encodedUrl = encodeURIComponent(url);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${designerName} | Tailoram Studio`,
          text: defaultShareText,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  // Social share destination URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  // QR code image via reliable public QR generator API
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    url
  )}&bgcolor=FFFFFF&color=1C1917&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-stone-200 relative my-6">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Shareable Studio Link
            </span>
          </div>
          <h3 className="text-xl font-black text-stone-900 tracking-tight pt-1">
            Share {designerName}
          </h3>
          <p className="text-xs text-stone-500">
            Share this profile with clients across WhatsApp, Instagram bio, Twitter, and Facebook.
          </p>
        </div>

        {/* Profile Preview Mini Card */}
        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={designerName}
              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-black text-lg shrink-0">
              {designerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
              {designerName}
            </h4>
            {location && (
              <p className="text-[11px] text-stone-500 truncate">
                📍 {location}
              </p>
            )}
            <p className="text-[10px] text-brand-700 font-bold truncate">
              tailoram.vercel.app/designer/...
            </p>
          </div>
        </div>

        {/* Quick Link Copy Field */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Unique Profile Link
          </label>
          <div className="flex items-center gap-2 bg-stone-100 border border-stone-300 rounded-2xl p-1.5 pr-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <input
              type="text"
              readOnly
              value={url}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-stone-800 font-mono focus:outline-none truncate selection:bg-brand-100"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn pt-0.5">
              <Check className="w-3.5 h-3.5" />
              <span>Link copied to clipboard! Ready to paste into your Instagram bio, WhatsApp, or Twitter.</span>
            </p>
          )}
        </div>

        {/* Social Share Grid */}
        <div className="space-y-2 pt-1">
          <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Share Directly To
          </label>
          <div className="grid grid-cols-4 gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <MessageCircle className="w-4 h-4 fill-white" />
              </div>
              <span className="text-[10px] font-bold mt-1.5">WhatsApp</span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-stone-950 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Twitter className="w-4 h-4 fill-white" />
              </div>
              <span className="text-[10px] font-bold mt-1.5">X (Twitter)</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200/80 text-sky-800 transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold mt-1.5">Telegram</span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 text-blue-900 transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <ExternalLink className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold mt-1.5">LinkedIn</span>
            </a>
          </div>
        </div>

        {/* QR Code Toggle for In-Person or Print Sharing */}
        <div className="pt-2 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-950 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>{showQr ? 'Hide QR Code' : 'Show Studio QR Code'}</span>
            </button>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>More Apps...</span>
              </button>
            )}
          </div>

          {showQr && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center space-y-2 animate-fadeIn text-center">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-stone-200">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR Code for ${designerName}`}
                  className="w-36 h-36 object-contain"
                />
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Clients can scan this QR code with any phone camera to view your profile instantly. Perfect for business cards, fabric tags, or salon displays.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
