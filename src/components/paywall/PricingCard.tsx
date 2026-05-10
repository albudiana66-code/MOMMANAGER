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
      className={`relative rounded-2xl p-5 border ${
        isAnnual
          ? 'border-[#E91E8C] bg-gradient-to-b from-[#E91E8C]/10 to-[var(--bg-card)]'
          : 'border-white/10 bg-[var(--bg-card)]'
      }`}
    >
      {isAnnual && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E91E8C] text-white text-xs font-bold px-3 py-1 rounded-full">
          {t('paywall.bestValue')}
        </span>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          {isAnnual ? t('paywall.annual') : t('paywall.monthly')}
        </h3>
        <span className="text-xl font-bold text-[#E91E8C]">
          {isAnnual ? t('paywall.annualPrice') : t('paywall.monthlyPrice')}
        </span>
      </div>

      <ul className="space-y-2 mb-5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="text-[#E91E8C]">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        size="lg"
        loading={loading}
        onClick={onSelect}
        className={!isAnnual ? 'bg-white/10 text-[var(--text-primary)] shadow-none' : ''}
      >
        {isAnnual ? t('paywall.startAnnual') : t('paywall.startMonthly')}
      </Button>
    </motion.div>
  );
}
