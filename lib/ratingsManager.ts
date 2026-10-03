import { supabase } from '@/lib/supabase';
import { Review } from '@/lib/types';

export interface ManualRatingData {
  rating: number;
  review_count?: number;
  notes?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'tailoram_designer_ratings';
export const LOCAL_REVIEWS_STORAGE_KEY = 'tailoram_user_reviews';

/**
 * Known user names mapping (for demo accounts & instant client resolution)
 */
export const KNOWN_USERS_NAME_MAP: Record<string, string> = {
  '11111111-1111-1111-1111-111111111101': 'Bamidele Adeleke',
  '11111111-1111-1111-1111-111111111102': 'Hajiya Maryam Bello',
  '11111111-1111-1111-1111-111111111103': 'Chukwuemeka Okoli',
  '11111111-1111-1111-1111-111111111104': 'Yewande Salami',
  '11111111-1111-1111-1111-111111111105': 'Zainab Danjuma',
  '11111111-1111-1111-1111-111111111106': 'Chidinma Nnamani',
  '22222222-2222-2222-2222-222222222201': 'Tunde Balogun',
  '22222222-2222-2222-2222-222222222202': 'Amina Mohammed',
  '22222222-2222-2222-2222-222222222203': 'Ngozi Eze',
  '22222222-2222-2222-2222-222222222204': 'Femi Adeyemi',
};

/**
 * Resolves the actual reviewer or client name for a review record
 */
export function resolveReviewClientName(rev: Partial<Review>): string {
  const currentName = rev.client?.full_name?.trim();
  if (currentName && currentName.toLowerCase() !== 'client') {
    return currentName;
  }
  const idToCheck = rev.reviewer_id || rev.client_id;
  if (idToCheck && KNOWN_USERS_NAME_MAP[idToCheck]) {
    return KNOWN_USERS_NAME_MAP[idToCheck];
  }
  return currentName || 'Verified Client';
}

/**
 * Get locally stored user reviews (fallback for demo sessions & offline resilience)
 */
export function getLocalUserReviews(): Review[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: Review[] = JSON.parse(localStorage.getItem(LOCAL_REVIEWS_STORAGE_KEY) || '[]');
    let modified = false;

    // Automatically repair any legacy review records where reviewer name was saved as 'Client'
    const repaired = raw.map((r) => {
      const resolvedName = resolveReviewClientName(r);
      const isGeneric = !r.client?.full_name || r.client.full_name.trim().toLowerCase() === 'client';
      if (isGeneric && resolvedName !== 'Client') {
        modified = true;
        return {
          ...r,
          client: {
            id: r.client_id || '',
            full_name: resolvedName,
            role: 'client' as const,
            created_at: r.created_at || '',
          },
        };
      }
      return r;
    });

    if (modified) {
      localStorage.setItem(LOCAL_REVIEWS_STORAGE_KEY, JSON.stringify(repaired));
    }
    return repaired;
  } catch {
    return [];
  }
}

/**
 * Save user review locally with guaranteed reviewer name
 */
export function saveLocalUserReview(review: Review): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalUserReviews();
    const resolvedName = resolveReviewClientName(review);
    const enriched: Review = {
      ...review,
      client: {
        id: review.client_id || review.client?.id || '',
        full_name: resolvedName,
        role: 'client',
        created_at: review.created_at || '',
      },
    };
    const filtered = list.filter((r) => r.id !== enriched.id);
    filtered.unshift(enriched);
    localStorage.setItem(LOCAL_REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not save local review:', e);
  }
}

/**
 * Merge remote Supabase reviews with locally created reviews with resolved names
 */
export function mergeWithLocalReviews(remoteReviews: Review[], designerId?: string): Review[] {
  const localList = getLocalUserReviews();
  const relevantLocal = designerId
    ? localList.filter((r) => r.designer_id === designerId)
    : localList;

  const existingIds = new Set(remoteReviews.map((r) => r.id));
  const newFromLocal = relevantLocal.filter((r) => !existingIds.has(r.id));
  const combined = [...newFromLocal, ...remoteReviews];

  // Guarantee all reviews display real names instead of generic 'Client'
  return combined.map((r) => {
    const resolvedName = resolveReviewClientName(r);
    const isGeneric = !r.client?.full_name || r.client.full_name.trim().toLowerCase() === 'client';
    if (isGeneric && resolvedName !== 'Client') {
      return {
        ...r,
        client: {
          id: r.client_id || '',
          full_name: resolvedName,
          role: 'client' as const,
          created_at: r.created_at || '',
        },
      };
    }
    return r;
  });
}

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
