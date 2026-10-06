import { supabase } from './supabase';

/**
 * Synchronous local check for whether WhatsApp features/notifications are enabled.
 * Default is FALSE.
 */
export function isWhatsAppEnabledLocally(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tailoram_whatsapp_enabled') === 'true';
  }
  return false;
}

/**
 * Checks if client WhatsApp chat buttons and milestone notification buttons should be visible.
 * Default is FALSE (hidden), but can be enabled anytime by an Admin in /entrypoint settings.
 */
export async function checkIsWhatsAppEnabled(): Promise<boolean> {
  // 1. Check Supabase platform_settings
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'whatsapp_enabled')
      .maybeSingle();

    if (!error && data?.value !== undefined && data?.value !== null) {
      const enabled = Boolean(data.value.enabled);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailoram_whatsapp_enabled', String(enabled));
      }
      return enabled;
    }
  } catch {
    // Fail silently on network/schema error
  }

  // 2. Check localStorage fallback
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tailoram_whatsapp_enabled');
    if (stored !== null) {
      return stored === 'true';
    }
  }

  // Default is false: WhatsApp buttons are hidden for now, per user request
  return false;
}
