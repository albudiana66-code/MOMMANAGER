import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { PricingCard } from '../components/paywall/PricingCard';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export function PaywallScreen() {
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'monthly' | 'annual' | 'trial' | null>(null);

  async function handleFreeTrial() {
    setLoading('trial');
    const now = new Date();
    await updateProfile({
      subscription_status: 'trial',
      trial_start: now.toISOString(),
      trial_end: addDays(now, 7).toISOString(),
    });
    setLoading(null);
    navigate('/');
  }

  async function handleSelect(plan: 'monthly' | 'annual') {
    setLoading(plan);
    await updateProfile({ subscription_status: 'active' });
    setLoading(null);
    navigate('/success');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] px-5 pt-12 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">👑</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
            {t('paywall.title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">
            {t('paywall.subtitle')}
          </p>
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t('paywall.trialExpiredMessage')}
        </p>

        {/* Free Trial Button */}
        <Button
          variant="primary"
          size="lg"
          loading={loading === 'trial'}
          onClick={handleFreeTrial}
          className="w-full"
        >
          {t('paywall.startFreeTrial')}
        </Button>

        {/* Pricing Cards */}
        <div className="flex flex-col gap-4">
          <PricingCard
            type="annual"
            onSelect={() => handleSelect('annual')}
            loading={loading === 'annual'}
          />
          <PricingCard
            type="monthly"
            onSelect={() => handleSelect('monthly')}
            loading={loading === 'monthly'}
          />
        </div>

        {/* Test mode */}
        <div className="text-center">
          <p className="text-xs text-[var(--text-secondary)] opacity-50 mb-2">
            {t('paywall.orActivateTest')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={loading === 'trial'}
            onClick={handleFreeTrial}
          >
            {t('paywall.activateTest')}
          </Button>
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)] opacity-60 mt-2">
          {t('paywall.subtitle')}
        </p>
      </motion.div>
    </div>
  );
}
