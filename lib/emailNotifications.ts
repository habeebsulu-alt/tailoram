import { supabase } from './supabase';

export interface EmailSettings {
  enabled: boolean;
  provider: 'resend' | 'sendgrid' | 'postmark' | 'smtp' | 'simulated';
  sender_email: string;
  sender_name: string;
  api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  notify_on_new_request: boolean;
  notify_on_quote_received: boolean;
  notify_on_deposit_paid: boolean;
  notify_on_order_ready: boolean;
  notify_on_balance_paid: boolean;
  notify_on_new_message: boolean;
  admin_notification_email?: string;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  provider: 'simulated',
  sender_email: 'notifications@tailoram.com',
  sender_name: 'Tailoram Nigeria',
  api_key: '',
  smtp_host: 'smtp.mailgun.org',
  smtp_port: 587,
  notify_on_new_request: true,
  notify_on_quote_received: true,
  notify_on_deposit_paid: true,
  notify_on_order_ready: true,
  notify_on_balance_paid: true,
  notify_on_new_message: true,
  admin_notification_email: 'admin@tailoram.com',
};

const LOCAL_STORAGE_KEY = 'tailoram_email_settings';
const LOCAL_STORAGE_LOGS_KEY = 'tailoram_email_logs';

export interface EmailNotificationLog {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  event: string;
  status: 'sent' | 'simulated' | 'failed' | 'disabled';
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Fetch current email notification settings from Supabase platform_settings
 * with seamless fallback to localStorage.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'email_settings')
      .maybeSingle();

    if (!error && data?.value) {
      const merged: EmailSettings = {
        ...DEFAULT_EMAIL_SETTINGS,
        ...data.value,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching email settings from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(local) };
      } catch {
        // parse error fallback
      }
    }
  }

  return DEFAULT_EMAIL_SETTINGS;
}

/**
 * Save email settings to Supabase platform_settings and local storage.
 */
export async function saveEmailSettings(settings: EmailSettings): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }

  try {
    const { error } = await supabase.from('platform_settings').upsert([
      {
        key: 'email_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn('Supabase save email_settings notice:', error.message);
    }
    return true;
  } catch (err) {
    console.warn('saveEmailSettings exception:', err);
    return true;
  }
}

/**
 * Fetch sent email notification history for the Admin panel.
 */
export function getEmailLogs(): EmailNotificationLog[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_LOGS_KEY) || '[]');
  } catch {
    return [];
  }
}

function logEmailNotification(log: EmailNotificationLog) {
  if (typeof window === 'undefined') return;
  try {
    const current = getEmailLogs();
    const updated = [log, ...current].slice(0, 50); // Keep last 50 emails
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Clear email notification history from local storage.
 */
export function clearEmailLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
  } catch {}
}

export const DEMO_EMAILS_MAP: Record<string, string> = {
  '11111111-1111-1111-1111-111111111101': 'dele.couture@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111102': 'maryam.bello@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111103': 'emeka.craft@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111104': 'yewande.adire@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111105': 'zainab.kaftan@demo.tailoram.com',
  '11111111-1111-1111-1111-111111111106': 'chidinma.bridal@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222201': 'tunde.balogun@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222202': 'amina.mohammed@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222203': 'ngozi.eze@demo.tailoram.com',
  '22222222-2222-2222-2222-222222222204': 'femi.adeyemi@demo.tailoram.com',
};

/**
 * Resolve realistic recipient email from user profile or demo mapping
 */
export function resolveUserEmail(userId?: string, fallback?: string): string {
  if (!userId) return fallback || 'client@tailoram.com';
  if (DEMO_EMAILS_MAP[userId]) return DEMO_EMAILS_MAP[userId];
  return fallback || `user-${userId.slice(0, 8)}@tailoram.com`;
}


/**
 * Triggers an email notification based on business events:
 * - 'new_request': Client commissions bespoke order -> notifies Designer
 * - 'quote_received': Designer sends price quote -> notifies Client
 * - 'deposit_paid': Client pays 40% deposit -> notifies Designer
 * - 'order_ready': Designer marks garment ready -> notifies Client
 * - 'balance_paid': Client pays 60% balance -> notifies Designer
 * - 'new_message': New message sent in chat -> notifies recipient
 */
export async function triggerEmailNotification(params: {
  event: 'new_request' | 'quote_received' | 'deposit_paid' | 'order_ready' | 'balance_paid' | 'new_message';
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  previewText: string;
  ctaLink?: string;
  metadata?: Record<string, any>;
}): Promise<{ status: 'sent' | 'simulated' | 'failed' | 'disabled'; message?: string }> {
  const settings = await getEmailSettings();

  if (!settings.enabled) {
    return { status: 'disabled', message: 'Email notifications are turned off in Admin settings.' };
  }

  // Check event-specific toggle
  const eventKeyMap: Record<string, keyof EmailSettings> = {
    new_request: 'notify_on_new_request',
    quote_received: 'notify_on_quote_received',
    deposit_paid: 'notify_on_deposit_paid',
    order_ready: 'notify_on_order_ready',
    balance_paid: 'notify_on_balance_paid',
    new_message: 'notify_on_new_message',
  };

  const toggleKey = eventKeyMap[params.event];
  if (toggleKey && !settings[toggleKey]) {
    return { status: 'disabled', message: `Notification for "${params.event}" is disabled in settings.` };
  }

  const logEntry: EmailNotificationLog = {
    id: `em_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    subject: params.subject,
    event: params.event,
    status: settings.provider === 'simulated' ? 'simulated' : 'sent',
    created_at: new Date().toISOString(),
    metadata: {
      ...params.metadata,
      preview: params.previewText,
      provider: settings.provider,
    },
  };

  logEmailNotification(logEntry);

  // If real API key is configured with Resend, trigger fetch call
  if (settings.provider === 'resend' && settings.api_key) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.api_key}`,
        },
        body: JSON.stringify({
          from: `${settings.sender_name} <${settings.sender_email}>`,
          to: [params.recipientEmail],
          subject: params.subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #b45309; margin: 0; font-size: 24px;">Tailoram Nigeria</h1>
                <p style="color: #78716c; font-size: 12px; margin-top: 4px;">Nigeria's Premier Bespoke Fashion Network</p>
              </div>
              <p style="font-size: 15px; line-height: 1.6;">Hello ${params.recipientName || 'there'},</p>
              <p style="font-size: 14px; line-height: 1.6; background-color: #fafaf9; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                ${params.previewText}
              </p>
              ${params.ctaLink ? `
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${params.ctaLink}" style="background-color: #b45309; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
                    View on Tailoram
                  </a>
                </div>
              ` : ''}
              <hr style="border: none; border-top: 1px solid #f5f5f4; margin: 24px 0;" />
              <p style="font-size: 11px; color: #a8a29e; text-align: center;">
                Sent automatically by Tailoram Nigeria. You can manage notifications anytime in your account.
              </p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        return { status: 'sent', message: 'Email dispatched successfully via Resend.' };
      }
    } catch (err: any) {
      console.warn('Resend dispatch error:', err);
    }
  }

  return {
    status: 'simulated',
    message: `[Simulated] Notification logged for ${params.recipientEmail}: "${params.subject}"`,
  };
}
