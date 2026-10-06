import { supabase } from '@/lib/supabase';
import { ClientMeasurements } from '@/lib/types';

export const LOCAL_STORAGE_VAULT_KEY = 'tailoram_measurements_vault';

export const DEFAULT_MEASUREMENT_PROFILES: ClientMeasurements[] = [
  {
    id: 'vault-demo-men-agbada',
    profile_name: 'Traditional Agbada & Senator Fit',
    gender: 'male',
    unit: 'in',
    chest: '42',
    shoulder: '19',
    sleeve: '26',
    round_sleeve: '15.5',
    cuff_wrist: '8.5',
    neck: '16.5',
    top_length: '38',
    waist: '34',
    hips: '41',
    thigh: '24',
    knee: '18',
    trouser_length: '41.5',
    ankle: '14',
    agbada_length: '54',
    head_circumference: '23',
    fit_preference: 'regular',
    notes: 'Well-pressed neckline, 2-inch cuff fold for cuff links, neat agbada side slit.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vault-demo-women-asoebi',
    profile_name: 'Luxury Aso Ebi & Corset Gown',
    gender: 'female',
    unit: 'in',
    chest: '36',
    underbust: '31',
    shoulder: '15.5',
    sleeve: '24',
    round_sleeve: '12.5',
    cuff_wrist: '6.5',
    neck: '14',
    top_length: '26',
    shoulder_to_waist: '16',
    shoulder_to_floor: '60',
    waist: '28',
    hips: '40',
    thigh: '22',
    trouser_length: '40',
    fit_preference: 'slim',
    notes: 'Boned corset with soft interior lining, back zip with modesty panel, floor length for 4-inch heels.',
    updated_at: new Date().toISOString(),
  },
];

/**
 * Get all saved measurement profiles for current user
 */
export async function getMeasurementVault(userId?: string): Promise<ClientMeasurements[]> {
  const localList = getLocalVault();

  if (!userId) {
    return localList.length > 0 ? localList : DEFAULT_MEASUREMENT_PROFILES;
  }

  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', `vault_${userId}`)
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      // Merge cloud and local
      const cloudMap = new Map<string, ClientMeasurements>();
      data.value.forEach((m: ClientMeasurements) => {
        if (m.id) cloudMap.set(m.id, m);
      });
      localList.forEach((m) => {
        if (m.id && !cloudMap.has(m.id)) {
          cloudMap.set(m.id, m);
        }
      });
      const merged = Array.from(cloudMap.values());
      saveLocalVault(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Failed to load cloud measurement vault:', err);
  }

  return localList.length > 0 ? localList : DEFAULT_MEASUREMENT_PROFILES;
}

/**
 * Save or update a measurement profile in the vault
 */
export async function saveMeasurementProfile(
  profile: ClientMeasurements,
  userId?: string
): Promise<ClientMeasurements> {
  const currentList = getLocalVault();
  const profileId = profile.id || `vault-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const updatedItem: ClientMeasurements = {
    ...profile,
    id: profileId,
    user_id: userId || profile.user_id,
    updated_at: new Date().toISOString(),
  };

  const existingIdx = currentList.findIndex((m) => m.id === profileId);
  let updatedList: ClientMeasurements[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = updatedItem;
  } else {
    updatedList = [updatedItem, ...currentList];
  }

  saveLocalVault(updatedList);

  if (userId) {
    try {
      await supabase.from('platform_settings').upsert([
        {
          key: `vault_${userId}`,
          value: updatedList,
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('Failed to sync vault to platform_settings:', err);
    }
  }

  return updatedItem;
}

/**
 * Delete a measurement profile
 */
export async function deleteMeasurementProfile(profileId: string, userId?: string): Promise<boolean> {
  const currentList = getLocalVault();
  const filtered = currentList.filter((m) => m.id !== profileId);
  saveLocalVault(filtered);

  if (userId) {
    try {
      await supabase.from('platform_settings').upsert([
        {
          key: `vault_${userId}`,
          value: filtered,
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('Failed to delete vault profile from cloud:', err);
    }
  }

  return true;
}

/**
 * Encode measurement profile to a shareable URL hash or token
 */
export function encodeMeasurementShareToken(profile: ClientMeasurements): string {
  try {
    const compact = {
      n: profile.profile_name,
      g: profile.gender,
      u: profile.unit,
      c: profile.chest,
      ub: profile.underbust,
      s: profile.shoulder,
      sl: profile.sleeve,
      rs: profile.round_sleeve,
      cw: profile.cuff_wrist,
      nk: profile.neck,
      tl: profile.top_length,
      sw: profile.shoulder_to_waist,
      sf: profile.shoulder_to_floor,
      w: profile.waist,
      h: profile.hips,
      th: profile.thigh,
      kn: profile.knee,
      tr: profile.trouser_length,
      ak: profile.ankle,
      ag: profile.agbada_length,
      hc: profile.head_circumference,
      fp: profile.fit_preference,
      nt: profile.notes,
    };
    const jsonStr = JSON.stringify(compact);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return encodeURIComponent(window.btoa(unescape(encodeURIComponent(jsonStr))));
    }
  } catch (err) {
    console.error('Failed to encode share token:', err);
  }
  return '';
}

/**
 * Decode shared measurement profile from token
 */
export function decodeMeasurementShareToken(token: string): ClientMeasurements | null {
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const decodedStr = decodeURIComponent(escape(window.atob(decodeURIComponent(token))));
      const c = JSON.parse(decodedStr);
      return {
        id: `shared-${Date.now()}`,
        profile_name: c.n || 'Shared Tailoram Fit',
        gender: c.g || 'unisex',
        unit: c.u || 'in',
        chest: c.c,
        underbust: c.ub,
        shoulder: c.s,
        sleeve: c.sl,
        round_sleeve: c.rs,
        cuff_wrist: c.cw,
        neck: c.nk,
        top_length: c.tl,
        shoulder_to_waist: c.sw,
        shoulder_to_floor: c.sf,
        waist: c.w,
        hips: c.h,
        thigh: c.th,
        knee: c.kn,
        trouser_length: c.tr,
        ankle: c.ak,
        agbada_length: c.ag,
        head_circumference: c.hc,
        fit_preference: c.fp,
        notes: c.nt,
      };
    }
  } catch (err) {
    console.warn('Failed to decode shared measurement token:', err);
  }
  return null;
}

// Local helpers
function getLocalVault(): ClientMeasurements[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalVault(list: ClientMeasurements[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not save vault to localStorage:', err);
  }
}
