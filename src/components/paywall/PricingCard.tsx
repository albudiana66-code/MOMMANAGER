import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';

interface PricingCardProps {
  type: 'monthly' | 'annual';
  onSelect: () => void;
  loading?: boolean;
}

export function PricingCard({ type, onSelect, loading }: PricingCardProps) {
  const { t } = useTranslation();
  const isAnnual = type === 'annual';

  const features = [
    t('paywall.feature1'),
    t('paywall.feature2'),
    t('paywall.feature3'),
    t('paywall.feature4'),
    t('paywall.feature5'),
  ];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative rounded-3xl p-5"
      style={isAnnual ? {
        background: 'linear-gradient(135deg, var(--accent-gold-soft) 0%, #FFFDF8 100%)',
        border: '1px solid rgba(201,169,110,0.35)',
        boxShadow: '0 4px 24px rgba(201,169,110,0.15)',
      } : {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {isAnnual && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full"
          style={{
            color: 'var(--accent-gold)',
            background: 'var(--accent-gold-soft)',
            border: '1px solid rgba(201,169,110,0.3)',
            fontWeight: 500,
          }}
        >
          {t('paywall.bestValue')}
        </span>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg text-[var(--text-primary)]"
          style={{ fontWeight: 600, letterSpacing: '-0.02em' }}
        >
          {isAnnual ? t('paywall.annual') : t('paywall.monthly')}
        </h3>
        <span
          className="text-xl"
          style={{ fontWeight: 700, color: isAnnual ? 'var(--accent-gold)' : 'var(--accent)' }}
        >
          {isAnnual ? t('paywall.annualPrice') : t('paywall.monthlyPrice')}
        </span>
      </div>

      <ul className="space-y-2 mb-5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span style={{ color: isAnnual ? 'var(--accent-gold)' : 'var(--accent)' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={isAnnual ? 'gold' : 'secondary'}
        size="lg"
        loading={loading}
        onClick={onSelect}
      >
        {isAnnual ? t('paywall.startAnnual') : t('paywall.startMonthly')}
      </Button>
    </motion.div>
  );
}
