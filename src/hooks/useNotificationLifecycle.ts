import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../context/AuthContext';
import { useNotificationSettings } from './useNotificationSettings';
import { checkNotificationPermission, ensureNotificationChannel, syncNotifications } from '../lib/notifications';
import { isNativeMobile } from '../lib/iap';

/**
 * Keeps pending notifications in sync with app lifecycle: creates the
 * Android channel once, (re)syncs on login/logout and whenever settings
 * change, and re-checks permission + resyncs whenever the app comes back
 * to the foreground (the user may have granted/revoked notifications from
 * the phone's own Settings app while MomManager was in the background).
 * Mounted once near the app root, inside both AuthProvider and the Router.
 */
export function useNotificationLifecycle(): void {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();

  useEffect(() => {
    ensureNotificationChannel();
  }, []);

  useEffect(() => {
    syncNotifications(user?.id ?? null, settings);
  }, [user, settings]);

  useEffect(() => {
    if (!isNativeMobile()) return;
    let handle: { remove: () => void } | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      checkNotificationPermission().then(() => syncNotifications(user?.id ?? null, settings));
    }).then((h) => { handle = h; });
    return () => handle?.remove();
  }, [user, settings]);
}
