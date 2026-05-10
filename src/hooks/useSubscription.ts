import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { differenceInDays, parseISO, isAfter } from 'date-fns';

export type SubscriptionState = 'loading' | 'active' | 'trial' | 'expired';

export function useSubscription() {
  const { profile, loading } = useAuth();

  const state = useMemo((): SubscriptionState => {
    if (loading) return 'loading';
    if (!profile) return 'expired';

    const status = profile.subscription_status;
    if (status === 'active') return 'active';

    if (status === 'trial' && profile.trial_end) {
      const end = parseISO(profile.trial_end);
      if (isAfter(end, new Date())) return 'trial';
      return 'expired';
    }

    return 'expired';
  }, [profile, loading]);

  const trialDaysLeft = useMemo(() => {
    if (state !== 'trial' || !profile?.trial_end) return 0;
    const days = differenceInDays(parseISO(profile.trial_end), new Date());
    return Math.max(0, days);
  }, [state, profile?.trial_end]);

  const hasAccess = state === 'active' || state === 'trial';

  return { state, trialDaysLeft, hasAccess };
}
