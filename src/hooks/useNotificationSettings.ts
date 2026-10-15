import { useAuth } from '../context/AuthContext';
import { syncNotifications } from '../lib/notifications';
import { normalizeNotificationSettings, type NotificationSettings } from '../types';

/**
 * The single place every screen reads/writes notification preferences from.
 * Settings live on the user's profile row (Supabase) so they survive a
 * reinstall or new device, same as theme/language/currency.
 */
export function useNotificationSettings() {
  const { user, profile, updateProfile } = useAuth();
  const settings: NotificationSettings = normalizeNotificationSettings(profile?.notification_settings);

  /** Persists new settings and immediately re-syncs pending notifications to match. */
  async function saveSettings(next: NotificationSettings): Promise<void> {
    await updateProfile({ notification_settings: next });
    await syncNotifications(user?.id ?? null, next);
  }

  /** Re-syncs pending notifications against the current settings — call after creating/editing/deleting any reminder-able item. */
  async function resync(): Promise<void> {
    await syncNotifications(user?.id ?? null, settings);
  }

  return { settings, saveSettings, resync };
}
