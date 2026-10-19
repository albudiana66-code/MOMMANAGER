import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from './useSubscription';
import type { NudgeSubscriptionContext } from '../lib/notifications';

/** The subscription facts upgrade nudges need (plan, trial status/start) — shared by every call site of syncNotifications() that has access to the signed-in user's profile. Memoized on the underlying primitives so it's a stable effect dependency, not a fresh object every render. */
export function useNudgeSubscriptionContext(): NudgeSubscriptionContext {
  const { profile } = useAuth();
  const { isFreeTrial } = useSubscription();
  const plan = profile?.subscription_status ?? null;
  const trialStart = profile?.trial_start ?? null;
  return useMemo(
    () => ({ plan, isFreeTrial, trialStartDate: trialStart ? new Date(trialStart) : null }),
    [plan, isFreeTrial, trialStart]
  );
}
