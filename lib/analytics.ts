import { supabase } from './supabase';
import { AnalyticsEvent } from './types';

export const LOCAL_STORAGE_EVENTS_KEY = 'tailoram_local_events_telemetry';
export const LOCAL_STORAGE_LAST_LOGINS_KEY = 'tailoram_user_last_logins';

export interface UserLoginRecord {
  userId?: string;
  email: string;
  role?: string;
  lastLoginAt: string;
  loginMethod: 'password' | 'demo' | 'oauth';
  status: 'success' | 'failed';
  failureReason?: string;
}

/**
 * Logs user actions to the 'events' table in Supabase.
 * Additionally mirrors to local telemetry buffer for immediate, real-time admin consumption.
 * Fails silently so user navigation or experience is never blocked.
 */
export async function logEvent(event: AnalyticsEvent): Promise<void> {
  const enrichedEvent: AnalyticsEvent = {
    ...event,
    created_at: event.created_at || new Date().toISOString(),
  };

  // 1. Buffer locally for instant display on Admin Dashboard
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
      const list: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
      list.unshift(enrichedEvent);
      // Keep last 150 events locally
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(list.slice(0, 150)));
    } catch {}
  }

  // 2. Insert to Supabase events table
  try {
    const { error } = await supabase.from('events').insert([
      {
        event_type: enrichedEvent.event_type,
        user_id: enrichedEvent.user_id || null,
        designer_id: enrichedEvent.designer_id || null,
        metadata: enrichedEvent.metadata || {},
      },
    ]);

    if (error) {
      console.warn('Analytics event log error:', error.message);
    }
  } catch (err) {
    console.warn('Failed to send analytics event:', err);
  }
}

/**
 * Record a user login attempt (both success and failure) with last login timestamps
 */
export async function recordLoginAttempt(record: UserLoginRecord): Promise<void> {
  // Update last logins table in platform_settings and local storage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LAST_LOGINS_KEY);
      const map: Record<string, UserLoginRecord> = raw ? JSON.parse(raw) : {};
      const key = (record.email || record.userId || 'unknown').toLowerCase();
      map[key] = record;
      localStorage.setItem(LOCAL_STORAGE_LAST_LOGINS_KEY, JSON.stringify(map));
    } catch {}
  }

  // Also sync to cloud platform_settings for cross-device visibility
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'user_last_logins')
      .maybeSingle();

    const cloudMap: Record<string, UserLoginRecord> = data?.value && typeof data.value === 'object' ? data.value : {};
    const key = (record.email || record.userId || 'unknown').toLowerCase();
    cloudMap[key] = record;

    await supabase.from('platform_settings').upsert([
      {
        key: 'user_last_logins',
        value: cloudMap,
        updated_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('Could not sync user_last_logins to platform_settings:', err);
  }

  // Log as formal event
  await logEvent({
    event_type: record.status === 'success' ? 'login_success' : 'login_failure',
    user_id: record.userId || null,
    metadata: {
      email: record.email,
      role: record.role,
      method: record.loginMethod,
      failure_reason: record.failureReason,
      timestamp: record.lastLoginAt,
    },
  });
}

/**
 * Record a user signup attempt
 */
export async function recordSignupAttempt(params: {
  email: string;
  fullName: string;
  role: string;
  status: 'success' | 'failed';
  failureReason?: string;
  userId?: string;
}): Promise<void> {
  await logEvent({
    event_type: params.status === 'success' ? 'signup_success' : 'signup_failure',
    user_id: params.userId || null,
    metadata: {
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      status: params.status,
      failure_reason: params.failureReason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Fetch all recorded user logins (for Admin Dashboard)
 */
export async function fetchUserLastLogins(): Promise<Record<string, UserLoginRecord>> {
  let localMap: Record<string, UserLoginRecord> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LAST_LOGINS_KEY);
      if (raw) localMap = JSON.parse(raw);
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'user_last_logins')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const merged = { ...localMap, ...data.value };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_LAST_LOGINS_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch {}

  return localMap;
}

/**
 * Fetch local buffered events (merged with cloud events)
 */
export function getLocalBufferedEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
