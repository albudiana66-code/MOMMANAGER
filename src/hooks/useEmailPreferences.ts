import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/supabaseAuth';

/**
 * The "Emails from MomManager" toggle in Settings. Controls
 * email_preferences.marketing_opt_in — only the tips/onboarding and "we
 * miss you" emails check this; service emails (welcome, subscribed,
 * cancellation, billing issue, trial-ending) always send regardless, same
 * as everywhere else in the lifecycle email system.
 */
export function useEmailPreferences() {
  const { user } = useAuth();
  const [marketingOptIn, setMarketingOptIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setMarketingOptIn(null); return; }
    let cancelled = false;
    supabase
      .from('email_preferences')
      .select('marketing_opt_in')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMarketingOptIn(data?.marketing_opt_in ?? true);
      });
    return () => { cancelled = true; };
  }, [user]);

  async function setMarketingOptInValue(value: boolean): Promise<void> {
    if (!user) return;
    setMarketingOptIn(value);
    const { error } = await supabase
      .from('email_preferences')
      .upsert({ user_id: user.id, marketing_opt_in: value }, { onConflict: 'user_id' });
    if (error) console.error('[useEmailPreferences] failed to save:', error.message);
  }

  return { marketingOptIn, setMarketingOptIn: setMarketingOptInValue };
}
