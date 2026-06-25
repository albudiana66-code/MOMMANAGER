import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { motion } from 'framer-motion';

export function TrialBanner() {
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
            ? 'Your trial has ended — Choose a plan'
            : `🌸 ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial`}
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
          {isExpired ? 'Choose plan' : 'Upgrade'}
        </button>
      </div>
    </motion.div>
  );
}
