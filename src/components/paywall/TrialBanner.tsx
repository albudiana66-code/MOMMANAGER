import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { motion } from 'framer-motion';

export function TrialBanner() {
  const { t } = useTranslation();
  const { state, trialDaysLeft } = useSubscription();
  const navigate = useNavigate();

  if (state !== 'trial') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-2xl overflow-hidden"
    >
      <div className="bg-gradient-to-r from-[#E91E8C]/20 to-purple-500/20 border border-[#E91E8C]/30 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-primary)]">
          {t('dashboard.trialBanner', { days: trialDaysLeft })}
        </p>
        <button
          onClick={() => navigate('/paywall')}
          className="text-xs font-semibold text-[#E91E8C] whitespace-nowrap ml-3"
        >
          {t('dashboard.upgrade')}
        </button>
      </div>
    </motion.div>
  );
}
