import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../hooks/useSubscription';
import { motion } from 'framer-motion';

export function TrialBanner() {
  const { t } = useTranslation();
  const { isFreeTrial, trialDaysLeft, isFree, state } = useSubscription();
  const navigate = useNavigate();

  // No banner for paying users
  if (state === 'active' && !isFreeTrial) return null;
  if (!isFreeTrial && !isFree) return null;

  const isExpired = !isFreeTrial && isFree;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-2xl overflow-hidden"
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: 'var(--accent-soft)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <p className="text-sm" style={{ color: isExpired ? 'var(--accent)' : 'var(--text-primary)' }}>
          {isExpired
            ? t('trialBanner.trialEnded')
            : t('trialBanner.daysLeft', { days: trialDaysLeft, plural: trialDaysLeft !== 1 ? 's' : '' })}
        </p>
        <button
          onClick={() => navigate('/paywall')}
          className="text-xs whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl"
          style={{
            color: 'var(--accent)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            fontWeight: 500,
          }}
        >
          {isExpired ? t('trialBanner.choosePlan') : t('trialBanner.upgrade')}
        </button>
      </div>
    </motion.div>
  );
}
