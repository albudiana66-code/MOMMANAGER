import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { identifyRevenueCatUser, resetRevenueCatUser } from '../lib/iap';

/**
 * Keeps RevenueCat's app_user_id in sync with the signed-in Supabase user —
 * logs in on sign-in/session-restore, logs out on sign-out. Mounted once
 * near the app root. See identifyRevenueCatUser() for why this matters:
 * without it, revenuecat-webhook can't tell which user an event is about.
 */
export function useRevenueCatIdentity(): void {
  const { user } = useAuth();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      if (identifiedUserId.current !== user.id) {
        identifiedUserId.current = user.id;
        identifyRevenueCatUser(user.id);
      }
    } else if (identifiedUserId.current !== null) {
      identifiedUserId.current = null;
      resetRevenueCatUser();
    }
  }, [user]);
}
