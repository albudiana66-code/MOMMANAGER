import { useAuth } from '../context/AuthContext';
import { syncNotifications } from '../lib/notifications';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '../types';

/**
 * The single place every screen reads/writes notification preferences from.
 * Settings live on the user's profile row (Supabase) so they survive a
 * reinstall or new device, same as theme/language/currency.
 */
export function useNotificationSettings() {
  const { user, profile, updateProfile } = useAuth();
  const settings: NotificationSettings = profile?.notification_settings ?? DEFAULT_NOTIFICATION_SETTINGS;

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
