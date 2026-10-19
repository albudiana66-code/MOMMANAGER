import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerDeepLinkHandler } from '../lib/notifications';
import { markNudgeTapped, type NudgeType } from '../lib/nudges';
import { useAuth } from '../context/AuthContext';

/** Shape of the react-router location state a notification tap navigates with — read it via `useLocation().state as NotificationDeepLinkState | null`. */
export interface NotificationDeepLinkState {
  notifType: string;
  notifItemId: string;
}

/**
 * Mount once near the app root, inside the Router. Drains any notification
 * tap — including one that launched the app cold, before this even mounted
 * — into a react-router navigation carrying { notifType, notifItemId } in
 * location state, so the target screen can open/select that exact item.
 * A tap on a nudge-type notification additionally resets that nudge's
 * ignored-streak/pause state, since tapping it is the opposite of ignoring it.
 */
export function useNotificationDeepLinkRouter(): void {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    return registerDeepLinkHandler((link) => {
      if (link.type === 'nudge' && user?.id) {
        markNudgeTapped(user.id, link.itemId as NudgeType);
      }
      navigate(link.route, { state: { notifType: link.type, notifItemId: link.itemId } });
    });
  }, [navigate, user]);
}
