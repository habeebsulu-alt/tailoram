/**
 * Tailoram - Canonical Application Domain & URL Utilities
 * Primary Domain: https://tailoram.com
 */

export const APP_DOMAIN = 'tailoram.com';
export const APP_URL = 'https://tailoram.com';

/**
 * Returns the current application base URL.
 * In the browser, dynamically uses window.location.origin (supports tailoram.com, localhost, and preview branches).
 * On the server, falls back to process.env.NEXT_PUBLIC_APP_URL or 'https://tailoram.com'.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || APP_URL;
}
