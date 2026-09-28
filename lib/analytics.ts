import { supabase } from './supabase';
import { AnalyticsEvent } from './types';

/**
 * Logs user actions to the 'events' table in Supabase.
 * Fails silently so user navigation or experience is never blocked.
 */
export async function logEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const { error } = await supabase.from('events').insert([
      {
        event_type: event.event_type,
        user_id: event.user_id || null,
        designer_id: event.designer_id || null,
        metadata: event.metadata || {},
      },
    ]);

    if (error) {
      console.warn('Analytics event log error:', error.message);
    }
  } catch (err) {
    console.warn('Failed to send analytics event:', err);
  }
}
