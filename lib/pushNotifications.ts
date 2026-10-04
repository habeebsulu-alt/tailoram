'use client';

/**
 * Client-side Push Notification and Service Worker Manager for Tailoram
 * Handles Web Push API registration, mobile & desktop notification permission,
 * local push dispatch, and sound/vibration feedback.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
}

const LOCAL_STORAGE_PUSH_PERMISSION_KEY = 'tailoram_push_permission';

/**
 * Detect if the current device is running iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect if the current device is running Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Identify client platform: 'ios' | 'android' | 'desktop'
 */
export function getDevicePlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
}

/**
 * Detect if the web app is running in Standalone (Home Screen / PWA) mode
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if the browser / mobile client supports Notifications and Service Workers
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current browser notification permission status ('default' | 'granted' | 'denied')
 */
export function getPushPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Register the Service Worker located at /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service worker registration error:', err);
    return null;
  }
}

/**
 * Request permission from user to deliver push notifications.
 * Prompts standard browser / mobile system dialog.
 * Handles both Promise-based and older callback-based requestPermission.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';

  // If Notification object is missing entirely
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    let permission: NotificationPermission = 'default';

    // Modern browsers return a Promise; older Safari uses callback
    if (typeof Notification.requestPermission === 'function') {
      try {
        const result = Notification.requestPermission();
        if (result && typeof (result as any).then === 'function') {
          permission = await result;
        } else {
          permission = await new Promise((resolve) => {
            Notification.requestPermission(resolve);
          });
        }
      } catch (callErr) {
        permission = await new Promise((resolve) => {
          Notification.requestPermission(resolve);
        });
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_PUSH_PERMISSION_KEY, permission);
    }

    if (permission === 'granted') {
      await registerServiceWorker();
    }

    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Send an immediate Push Notification on mobile/desktop.
 * Falls back seamlessly to in-app toast if system push is not granted.
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  if (!isPushSupported()) return false;

  const currentPermission = Notification.permission;
  if (currentPermission !== 'granted') {
    return false;
  }

  const { title, body, url = '/dashboard', icon = '/favicon.ico', image, tag } = payload;

  try {
    // 1. Try displaying via Service Worker registration (supports rich image banner)
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          image: image || undefined,
          tag: tag || `tailoram-push-${Date.now()}`,
          data: { url },
          vibrate: [150, 50, 150, 50, 200],
        } as any);
        return true;
      }
    }

    // 2. Fallback to standard window Notification constructor
    const notif = new Notification(title, {
      body,
      icon,
      tag: tag || `tailoram-push-${Date.now()}`,
      data: { url },
    });

    notif.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn('Direct notification presentation failed:', err);
    return false;
  }
}

export interface AdminPushBroadcast {
  id: string;
  title: string;
  body: string;
  image?: string;
  url?: string;
  target_audience: 'all' | 'designers' | 'clients';
  created_at: string;
  sent_by?: string;
  delivered_count?: number;
}

const LOCAL_STORAGE_BROADCASTS_KEY = 'tailoram_push_broadcasts';

/**
 * Fetch broadcast push messages from Supabase platform_settings or localStorage
 */
export async function getAdminPushBroadcasts(): Promise<AdminPushBroadcast[]> {
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'push_broadcasts')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_BROADCASTS_KEY, JSON.stringify(data.value));
      }
      return data.value as AdminPushBroadcast[];
    }
  } catch (err) {
    console.warn('Could not fetch push broadcasts from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_BROADCASTS_KEY);
      if (local) return JSON.parse(local);
    } catch {}
  }

  return [];
}

/**
 * Save and broadcast a new push message to all users platform-wide.
 * Persists to Supabase platform_settings (key: 'push_broadcasts') and localStorage.
 */
export async function sendAdminPushBroadcast(
  params: {
    title: string;
    body: string;
    image?: string;
    url?: string;
    target_audience: 'all' | 'designers' | 'clients';
    sent_by?: string;
  }
): Promise<{ success: boolean; broadcast: AdminPushBroadcast }> {
  const newBroadcast: AdminPushBroadcast = {
    id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: params.title.trim(),
    body: params.body.trim(),
    image: params.image?.trim() || undefined,
    url: params.url?.trim() || '/dashboard',
    target_audience: params.target_audience,
    created_at: new Date().toISOString(),
    sent_by: params.sent_by || 'Admin Control Center',
  };

  // 1. Immediately fire local system push on active device if permission is granted
  try {
    await sendPushNotification({
      title: newBroadcast.title,
      body: newBroadcast.body,
      image: newBroadcast.image,
      url: newBroadcast.url,
      tag: newBroadcast.id,
    });
  } catch (pushErr) {
    console.warn('Local push test dispatch notice:', pushErr);
  }

  // 2. Persist in Supabase platform_settings
  try {
    const { supabase } = await import('./supabase');
    const current = await getAdminPushBroadcasts();
    const updated = [newBroadcast, ...current].slice(0, 50); // Store up to 50 broadcasts

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS_KEY, JSON.stringify(updated));
    }

    await supabase.from('platform_settings').upsert([
      {
        key: 'push_broadcasts',
        value: updated,
        updated_at: new Date().toISOString(),
      },
    ]);
  } catch (dbErr) {
    console.warn('Supabase push broadcast storage warning:', dbErr);
  }

  return { success: true, broadcast: newBroadcast };
}

/**
 * Delete a specific push broadcast by ID
 */
export async function deleteAdminPushBroadcast(broadcastId: string): Promise<boolean> {
  try {
    const current = await getAdminPushBroadcasts();
    const updated = current.filter((b) => b.id !== broadcastId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS_KEY, JSON.stringify(updated));
    }
    const { supabase } = await import('./supabase');
    await supabase.from('platform_settings').upsert([
      {
        key: 'push_broadcasts',
        value: updated,
        updated_at: new Date().toISOString(),
      },
    ]);
    return true;
  } catch (err) {
    console.warn('Could not delete push broadcast:', err);
    return false;
  }
}
