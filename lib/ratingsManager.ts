import { supabase } from '@/lib/supabase';

export interface ManualRatingData {
  rating: number;
  review_count?: number;
  notes?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'tailoram_designer_ratings';

/**
 * Read manual ratings from localStorage (instant zero-latency client access)
 */
export function getLocalManualRatings(): Record<string, ManualRatingData> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Fetch manual designer ratings from platform_settings table in Supabase and sync with localStorage
 */
export async function fetchManualRatings(): Promise<Record<string, ManualRatingData>> {
  const local = getLocalManualRatings();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'designer_ratings')
      .single();

    if (!error && data?.value && typeof data.value === 'object') {
      const merged = { ...local, ...(data.value as Record<string, ManualRatingData>) };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server ratings settings:', err);
  }
  return local;
}

/**
 * Save manual rating override for a designer
 */
export async function saveManualRating(
  designerId: string,
  rating: number,
  reviewCount?: number,
  notes?: string
): Promise<void> {
  const clampedRating = Math.max(1.0, Math.min(5.0, Math.round(Number(rating) * 10) / 10));
  const current = getLocalManualRatings();

  const updated: Record<string, ManualRatingData> = {
    ...current,
    [designerId]: {
      rating: clampedRating,
      review_count: reviewCount !== undefined && !isNaN(Number(reviewCount)) ? Math.max(0, Math.round(Number(reviewCount))) : undefined,
      notes: notes || undefined,
      updated_at: new Date().toISOString(),
    },
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  try {
    // Fetch latest from server first to prevent overwriting other designers
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'designer_ratings')
      .single();

    const serverVal = (data?.value && typeof data.value === 'object') ? data.value : {};
    const finalMerged = { ...serverVal, ...updated };

    await supabase.from('platform_settings').upsert({
      key: 'designer_ratings',
      value: finalMerged,
    });
  } catch (err) {
    console.warn('Could not persist manual rating to platform_settings:', err);
  }
}

/**
 * Remove manual rating override and revert to natural reviews
 */
export async function removeManualRating(designerId: string): Promise<void> {
  const current = getLocalManualRatings();
  delete current[designerId];

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  }

  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'designer_ratings')
      .single();

    if (data?.value && typeof data.value === 'object') {
      const serverVal = { ...data.value };
      delete serverVal[designerId];
      await supabase.from('platform_settings').upsert({
        key: 'designer_ratings',
        value: serverVal,
      });
    }
  } catch (err) {
    console.warn('Could not remove manual rating from platform_settings:', err);
  }
}

/**
 * Calculate the effective rating and review count for a designer, accounting for manual overrides
 */
export function computeEffectiveRating(
  designerId: string,
  naturalReviews: { rating: number }[] = [],
  manualMap?: Record<string, ManualRatingData>
): { rating: number | null; reviewCount: number; isOverridden: boolean } {
  const map = manualMap || getLocalManualRatings();
  const manual = map[designerId];

  const naturalCount = naturalReviews.length;
  const naturalAvg = naturalCount > 0
    ? naturalReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / naturalCount
    : null;

  if (manual && typeof manual.rating === 'number' && !isNaN(manual.rating)) {
    return {
      rating: manual.rating,
      reviewCount: manual.review_count !== undefined ? manual.review_count : Math.max(1, naturalCount),
      isOverridden: true,
    };
  }

  return {
    rating: naturalAvg,
    reviewCount: naturalCount,
    isOverridden: false,
  };
}
