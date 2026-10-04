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

  const { title, body, url = '/dashboard', icon = '/icon-192.png', tag } = payload;

  try {
    // 1. Try displaying via Service Worker registration (recommended for mobile Chrome/Edge/Firefox)
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: tag || `tailoram-push-${Date.now()}`,
          data: { url },
          vibrate: [200, 100, 200],
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
