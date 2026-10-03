/**
 * Formats a raw phone string into standard international Nigerian WhatsApp format (+234...).
 *
 * Rules:
 * - If user types "08012345678", removes leading '0' and prefixes with "+234 " -> "+234 801 234 5678"
 * - If user types "8012345678", prefixes with "+234 "
 * - If user types "2348012345678", strips leading 234 and prefixes with "+234 "
 * - Strips alphabetic/unnecessary characters while preserving '+' if already present
 */
export function formatNigerianPhoneForInput(input: string): string {
  if (!input) return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  // If user starts with '+' and already has a country code other than Nigeria (+1, +44, etc.)
  if (trimmed.startsWith('+') && !trimmed.startsWith('+234')) {
    // Keep international number clean
    return '+' + trimmed.slice(1).replace(/[^0-9\s]/g, '');
  }

  // Extract all digits
  let digits = trimmed.replace(/\D/g, '');

  // Strip leading Nigerian country code '234' if typed
  if (digits.startsWith('234')) {
    digits = digits.slice(3);
  }

  // Strip leading '0' (the domestic Nigerian trunk prefix)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Limit to 10 subscriber digits (e.g., 801 234 5678)
  digits = digits.slice(0, 10);

  if (digits.length === 0) {
    return trimmed.startsWith('+') ? '+234 ' : '';
  }

  // Format as "+234 801 234 5678"
  let formatted = '+234';
  if (digits.length > 0) {
    formatted += ' ' + digits.slice(0, 3);
  }
  if (digits.length > 3) {
    formatted += ' ' + digits.slice(3, 6);
  }
  if (digits.length > 6) {
    formatted += ' ' + digits.slice(6, 10);
  }

  return formatted;
}

/**
 * Normalizes any phone number into pure digits for WhatsApp wa.me links.
 * E.g., "+234 801 234 5678" -> "2348012345678"
 * E.g., "08012345678" -> "2348012345678"
 */
export function normalizePhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone) return '';

  const trimmed = phone.trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // If it's already got international country code (e.g., 234...)
  if (digits.startsWith('234')) {
    return digits;
  }

  // If it starts with 0 (Nigerian local: 080..., 070..., 090..., 081...)
  if (digits.startsWith('0')) {
    return '234' + digits.slice(1);
  }

  // If 10 digits without leading 0 (e.g., 8012345678)
  if (digits.length === 10) {
    return '234' + digits;
  }

  return digits;
}
