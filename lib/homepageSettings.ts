import { supabase } from './supabase';

export type HomepageSortOption = 'ranking' | 'rating' | 'reviews' | 'newest' | 'all';

export interface HomepageSortMeta {
  id: HomepageSortOption;
  label: string;
  shortLabel: string;
  description: string;
  badge?: string;
}

export const HOMEPAGE_SORT_OPTIONS: HomepageSortMeta[] = [
  {
    id: 'ranking',
    label: '🏆 Highest Ranking (Top Rated & Score)',
    shortLabel: 'Top Ranked',
    description: 'Algorithmic ranking based on quality score, verification status, and recent positive client reviews.',
    badge: 'Recommended',
  },
  {
    id: 'rating',
    label: '⭐ Highest Average Stars (5.0 First)',
    shortLabel: 'Highest Rating',
    description: 'Ranks fashion designers and tailors strictly by highest average star rating.',
  },
  {
    id: 'reviews',
    label: '🔥 Most Client Reviews',
    shortLabel: 'Most Reviews',
    description: 'Puts established tailoring houses with the highest number of verified client reviews first.',
  },
  {
    id: 'newest',
    label: '✨ Newest Designers (Recently Joined)',
    shortLabel: 'Newest First',
    description: 'Promotes newly onboarded fashion creators and artisan studios across Nigeria.',
  },
  {
    id: 'all',
    label: '🎲 All Designers (Discover / Random Shuffle)',
    shortLabel: 'Discover Shuffle',
    description: 'Evenly randomizes designers on every visitor session so all studios across Nigeria get equal visibility.',
  },
];

const LOCAL_STORAGE_KEY = 'tailoram_homepage_default_sort';
const PLATFORM_SETTINGS_KEY = 'homepage_sorting';
const DEFAULT_SORT: HomepageSortOption = 'ranking';

export function isValidSortOption(val: any): val is HomepageSortOption {
  return ['ranking', 'rating', 'reviews', 'newest', 'all'].includes(val);
}

/**
 * Fetch the currently configured default sorting mode for the homepage.
 * Tries Supabase platform_settings first, then localStorage fallback, defaulting to 'ranking'.
 */
export async function getHomepageDefaultSort(): Promise<HomepageSortOption> {
  // 1. Try Supabase platform_settings
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', PLATFORM_SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const dbSort = (data.value as any).default_sort as HomepageSortOption;
      if (isValidSortOption(dbSort)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, dbSort);
        }
        return dbSort;
      }
    }
  } catch {
    // Network or schema fallback
  }

  // 2. Try localStorage fallback
  if (typeof window !== 'undefined') {
    const localSort = localStorage.getItem(LOCAL_STORAGE_KEY) as HomepageSortOption;
    if (isValidSortOption(localSort)) {
      return localSort;
    }
  }

  return DEFAULT_SORT;
}

/**
 * Persist the default homepage sorting mode to Supabase platform_settings and localStorage.
 */
export async function saveHomepageDefaultSort(sortOption: HomepageSortOption): Promise<boolean> {
  if (!isValidSortOption(sortOption)) return false;

  // 1. Save to localStorage immediately
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, sortOption);
  }

  // 2. Persist to Supabase platform_settings
  try {
    const { error } = await supabase.from('platform_settings').upsert({
      key: PLATFORM_SETTINGS_KEY,
      value: {
        default_sort: sortOption,
        updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch (err) {
    console.warn('Could not persist homepage sorting setting to Supabase:', err);
    return false;
  }
}
