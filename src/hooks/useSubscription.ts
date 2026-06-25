import { useAuth } from '../context/AuthContext';
import type { SubscriptionPlan } from '../types';

export function useSubscription() {
  const { profile } = useAuth();

  const plan: SubscriptionPlan = profile?.subscription_status ?? null;

  const isFreeTrial = plan === 'free_trial';
  const isStandard = plan === 'standard_monthly' || plan === 'standard_yearly';
  const isPro = plan === 'pro_monthly' || plan === 'pro_yearly';
  const isActive = isFreeTrial || isStandard || isPro;
  const isFree = !isActive;

  const canUseProFeature = isPro;

  const trialDaysLeft = (() => {
    if (!isFreeTrial) return 0;
    const exp = profile?.subscription_expires_at || profile?.trial_end;
    if (!exp) return 0;
    const diff = new Date(exp).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  // Legacy: support old 'trial' / 'active' subscription_status values
  const _raw = (profile?.subscription_status as string) ?? null;
  const hasAccess =
    isActive ||
    _raw === 'active' ||
    (_raw === 'trial' && !!profile?.trial_end && new Date(profile.trial_end) > new Date());

  // Legacy state field used by TrialBanner / old code
  const state: 'loading' | 'active' | 'trial' | 'expired' =
    isPro || isStandard || _raw === 'active' ? 'active'
    : (isFreeTrial || _raw === 'trial') && trialDaysLeft > 0 ? 'trial'
    : hasAccess ? 'active'
    : 'expired';

  return { plan, isFreeTrial, isStandard, isPro, isActive, isFree, canUseProFeature, trialDaysLeft, hasAccess, state };
}
