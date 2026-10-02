import { supabase } from './supabase';

/**
 * Checks if client WhatsApp chat buttons should be visible across the platform.
 * Default is FALSE (hidden), but can be enabled anytime by an Admin in /admin settings.
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
