'use client';

import React, { useState } from 'react';
import { ClientMeasurements } from '@/lib/types';
import {
  X,
  Ruler,
  Check,
  Copy,
  Sparkles,
  Info,
} from 'lucide-react';

interface MeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurements?: ClientMeasurements | Record<string, any> | null;
  clientName?: string;
  orderNumber?: string;
}

export default function MeasurementsModal({
  isOpen,
  onClose,
  measurements,
  clientName,
  orderNumber,
}: MeasurementsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !measurements) return null;

  const entries: { label: string; value: string; unit?: string }[] = [];

  const addField = (key: string, label: string) => {
    const val = (measurements as any)[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      entries.push({ label, value: String(val).trim(), unit: 'in' });
    }
  };

  addField('chest', 'Chest / Bust');
  addField('underbust', 'Underbust');
  addField('shoulder', 'Shoulder Width');
  addField('sleeve', 'Sleeve Length');
  addField('round_sleeve', 'Bicep / Armhole');
  addField('cuff_wrist', 'Wrist / Cuff');
  addField('neck', 'Neck Circumference');
  addField('top_length', 'Top / Shirt / Kaftan Length');
  addField('shoulder_to_waist', 'Shoulder to Waist');
  addField('shoulder_to_floor', 'Shoulder to Floor / Gown Length');
  addField('waist', 'Waist Circumference');
  addField('hips', 'Hips Circumference');
  addField('thigh', 'Thigh / Lap');
  addField('knee', 'Knee');
  addField('trouser_length', 'Trouser / Pant Length');
  addField('ankle', 'Ankle / Hem');
  addField('agbada_length', 'Agbada Flow Length');
  addField('head_circumference', 'Fila / Cap Size');

  // Check any additional custom keys that might have been provided
  Object.keys(measurements).forEach((k) => {
    if (![
      'chest', 'underbust', 'shoulder', 'sleeve', 'round_sleeve', 'cuff_wrist',
      'neck', 'top_length', 'shoulder_to_waist', 'shoulder_to_floor',
      'waist', 'hips', 'thigh', 'knee', 'trouser_length', 'ankle',
      'agbada_length', 'head_circumference', 'fit_preference', 'notes',
      'id', 'user_id', 'profile_name', 'gender', 'unit', 'updated_at'
    ].includes(k)) {
      const val = (measurements as any)[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const prettyLabel = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        entries.push({ label: prettyLabel, value: String(val).trim(), unit: 'in' });
      }
    }
  });

  const fitPref = (measurements as any).fit_preference;
  const notes = (measurements as any).notes;

  const copyToClipboard = () => {
    const lines = [
      `📐 Tailoring Measurements for ${clientName || 'Client'}${orderNumber ? ` (Order #${orderNumber})` : ''}:`,
      ...entries.map((e) => `• ${e.label}: ${e.value}${e.unit ? ` ${e.unit}` : ''}`),
    ];
    if (fitPref) lines.push(`• Fit Preference: ${fitPref.toUpperCase()}`);
    if (notes) lines.push(`• Fit Notes: "${notes}"`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-stone-200 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                Client Body Measurements
              </h3>
              <p className="text-xs text-stone-500">
                {clientName ? `Provided by ${clientName}` : 'Custom Sizing Chart'}
                {orderNumber && ` • Order #${orderNumber}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* Fit Preference Pill */}
          {fitPref && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Fit Preference
                </span>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 uppercase">
                {fitPref} Fit
              </span>
            </div>
          )}

          {/* Measurements Grid */}
          {entries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    {entry.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-stone-900 tracking-tight">
                      {entry.value}
                    </span>
                    {entry.unit && (
                      <span className="text-xs font-bold text-stone-400">
                        {entry.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
              No specific numeric measurements entered.
            </div>
          )}

          {/* Fit Notes */}
          {notes && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-stone-500" />
                Additional Fit Notes
              </span>
              <p className="text-xs text-stone-600 italic">
                "{notes}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Copy Card</span>
                </>
              )}
            </button>

            <a
              href="/vault"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-700" />
              <span>Sizing Vault ↗</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
