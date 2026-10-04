import { supabase } from '@/lib/supabase';
import { UserRole, DesignerProfile, StoreProduct } from '@/lib/types';

// ============================================================
// STORAGE KEYS FOR ADMIN OVERRIDES & PERSISTENCE
// ============================================================
export const STORAGE_USER_ROLES = 'tailoram_user_roles';
export const STORAGE_DELETED_USERS = 'tailoram_deleted_user_profiles';
export const STORAGE_DELETED_DESIGNERS = 'tailoram_deleted_designer_profiles';
export const STORAGE_DESIGNER_OVERRIDES = 'tailoram_updated_designer_profiles';
export const STORAGE_PRODUCT_OVERRIDES = 'tailoram_product_overrides';
export const STORAGE_DELETED_PRODUCTS = 'tailoram_deleted_products';
export const STORAGE_DELETED_REVIEWS = 'tailoram_deleted_reviews';

// ============================================================
// 1. USER ROLE OVERRIDES
// ============================================================
export function getLocalUserRoleOverrides(): Record<string, UserRole> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USER_ROLES) || '{}');
  } catch {
    return {};
  }
}

export async function fetchUserRoleOverrides(): Promise<Record<string, UserRole>> {
  const local = getLocalUserRoleOverrides();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'user_roles')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const merged: Record<string, UserRole> = { ...local, ...(data.value as Record<string, UserRole>) };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_USER_ROLES, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server user_roles settings:', err);
  }
  return local;
}

export async function saveUserRoleOverride(userId: string, newRole: UserRole): Promise<void> {
  // 1. Update localStorage
  const current = getLocalUserRoleOverrides();
  const updated: Record<string, UserRole> = {
    ...current,
    [userId]: newRole,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_USER_ROLES, JSON.stringify(updated));
  }

  // 2. Try direct Supabase update on profiles table
  try {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  } catch (err) {
    console.warn('Direct profiles update note:', err);
  }

  // 3. Try admin RPC if available
  try {
    await supabase.rpc('admin_update_profile_role', { target_user_id: userId, new_role: newRole });
  } catch {}

  // 4. Save to platform_settings for persistent global sync
  try {
    const serverMap = await fetchUserRoleOverrides();
    const fullUpdated = { ...serverMap, [userId]: newRole };
    await supabase.from('platform_settings').upsert({
      key: 'user_roles',
      value: fullUpdated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist user_roles to platform_settings:', err);
  }
}

// ============================================================
// 2. DELETED USERS
// ============================================================
export function getLocalDeletedUserIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_USERS) || '[]');
  } catch {
    return [];
  }
}

export async function fetchDeletedUserIds(): Promise<string[]> {
  const local = getLocalDeletedUserIds();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deleted_user_profiles')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const merged = Array.from(new Set([...local, ...(data.value as string[])]));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_DELETED_USERS, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server deleted_user_profiles:', err);
  }
  return local;
}

export async function saveDeletedUserId(userId: string): Promise<void> {
  const current = getLocalDeletedUserIds();
  if (!current.includes(userId)) {
    current.push(userId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DELETED_USERS, JSON.stringify(current));
    }
  }

  try {
    const serverList = await fetchDeletedUserIds();
    const updated = Array.from(new Set([...serverList, userId]));
    await supabase.from('platform_settings').upsert({
      key: 'deleted_user_profiles',
      value: updated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist deleted user to platform_settings:', err);
  }
}

// ============================================================
// 3. DESIGNER PROFILE OVERRIDES (Verification, Featured, Store, Details)
// ============================================================
export function getLocalDesignerOverrides(): Record<string, Partial<DesignerProfile>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DESIGNER_OVERRIDES) || '{}');
  } catch {
    return {};
  }
}

export async function fetchDesignerOverrides(): Promise<Record<string, Partial<DesignerProfile>>> {
  const local = getLocalDesignerOverrides();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'designer_overrides')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const merged: Record<string, Partial<DesignerProfile>> = {
        ...local,
        ...(data.value as Record<string, Partial<DesignerProfile>>),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_DESIGNER_OVERRIDES, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server designer_overrides:', err);
  }
  return local;
}

export async function saveDesignerOverride(
  designerId: string,
  updates: Partial<DesignerProfile>
): Promise<void> {
  // 1. Update localStorage
  const current = getLocalDesignerOverrides();
  const updated: Record<string, Partial<DesignerProfile>> = {
    ...current,
    [designerId]: {
      ...(current[designerId] || {}),
      ...updates,
    },
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_DESIGNER_OVERRIDES, JSON.stringify(updated));
  }

  // 2. Try direct Supabase update on designer_profiles table
  try {
    await supabase.from('designer_profiles').update(updates).eq('id', designerId);
  } catch (err) {
    console.warn('Direct designer_profiles update note:', err);
  }

  // 3. Save to platform_settings for persistent global sync
  try {
    const serverMap = await fetchDesignerOverrides();
    const fullUpdated = {
      ...serverMap,
      [designerId]: {
        ...(serverMap[designerId] || {}),
        ...updates,
      },
    };
    await supabase.from('platform_settings').upsert({
      key: 'designer_overrides',
      value: fullUpdated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist designer_overrides to platform_settings:', err);
  }
}

// ============================================================
// 4. DELETED DESIGNERS
// ============================================================
export function getLocalDeletedDesignerIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_DESIGNERS) || '[]');
  } catch {
    return [];
  }
}

export async function fetchDeletedDesignerIds(): Promise<string[]> {
  const local = getLocalDeletedDesignerIds();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deleted_designer_profiles')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const merged = Array.from(new Set([...local, ...(data.value as string[])]));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_DELETED_DESIGNERS, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server deleted_designer_profiles:', err);
  }
  return local;
}

export async function saveDeletedDesignerId(designerId: string): Promise<void> {
  const current = getLocalDeletedDesignerIds();
  if (!current.includes(designerId)) {
    current.push(designerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DELETED_DESIGNERS, JSON.stringify(current));
    }
  }

  try {
    const serverList = await fetchDeletedDesignerIds();
    const updated = Array.from(new Set([...serverList, designerId]));
    await supabase.from('platform_settings').upsert({
      key: 'deleted_designer_profiles',
      value: updated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist deleted designer to platform_settings:', err);
  }
}

// ============================================================
// 5. PRODUCT (RTW) OVERRIDES & DELETIONS
// ============================================================
export function getLocalProductOverrides(): Record<string, Partial<StoreProduct>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PRODUCT_OVERRIDES) || '{}');
  } catch {
    return {};
  }
}

export async function fetchProductOverrides(): Promise<Record<string, Partial<StoreProduct>>> {
  const local = getLocalProductOverrides();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'product_overrides')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const merged: Record<string, Partial<StoreProduct>> = {
        ...local,
        ...(data.value as Record<string, Partial<StoreProduct>>),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_PRODUCT_OVERRIDES, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server product_overrides:', err);
  }
  return local;
}

export async function saveProductOverride(
  productId: string,
  updates: Partial<StoreProduct>
): Promise<void> {
  const current = getLocalProductOverrides();
  const updated: Record<string, Partial<StoreProduct>> = {
    ...current,
    [productId]: {
      ...(current[productId] || {}),
      ...updates,
    },
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_PRODUCT_OVERRIDES, JSON.stringify(updated));
  }

  try {
    await supabase.from('store_products').update(updates).eq('id', productId);
  } catch (err) {
    console.warn('Direct store_products update note:', err);
  }

  try {
    const serverMap = await fetchProductOverrides();
    const fullUpdated = {
      ...serverMap,
      [productId]: {
        ...(serverMap[productId] || {}),
        ...updates,
      },
    };
    await supabase.from('platform_settings').upsert({
      key: 'product_overrides',
      value: fullUpdated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist product_overrides to platform_settings:', err);
  }
}

export function getLocalDeletedProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_PRODUCTS) || '[]');
  } catch {
    return [];
  }
}

export async function fetchDeletedProductIds(): Promise<string[]> {
  const local = getLocalDeletedProductIds();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deleted_products')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const merged = Array.from(new Set([...local, ...(data.value as string[])]));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_DELETED_PRODUCTS, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server deleted_products:', err);
  }
  return local;
}

export async function saveDeletedProductId(productId: string): Promise<void> {
  const current = getLocalDeletedProductIds();
  if (!current.includes(productId)) {
    current.push(productId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DELETED_PRODUCTS, JSON.stringify(current));
    }
  }

  try {
    const serverList = await fetchDeletedProductIds();
    const updated = Array.from(new Set([...serverList, productId]));
    await supabase.from('platform_settings').upsert({
      key: 'deleted_products',
      value: updated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist deleted product to platform_settings:', err);
  }
}

// ============================================================
// 6. DELETED REVIEWS
// ============================================================
export function getLocalDeletedReviewIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_REVIEWS) || '[]');
  } catch {
    return [];
  }
}

export async function fetchDeletedReviewIds(): Promise<string[]> {
  const local = getLocalDeletedReviewIds();
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deleted_reviews')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const merged = Array.from(new Set([...local, ...(data.value as string[])]));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_DELETED_REVIEWS, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch server deleted_reviews:', err);
  }
  return local;
}

export async function saveDeletedReviewId(reviewId: string): Promise<void> {
  const current = getLocalDeletedReviewIds();
  if (!current.includes(reviewId)) {
    current.push(reviewId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DELETED_REVIEWS, JSON.stringify(current));
    }
  }

  try {
    const serverList = await fetchDeletedReviewIds();
    const updated = Array.from(new Set([...serverList, reviewId]));
    await supabase.from('platform_settings').upsert({
      key: 'deleted_reviews',
      value: updated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to persist deleted review to platform_settings:', err);
  }
}
