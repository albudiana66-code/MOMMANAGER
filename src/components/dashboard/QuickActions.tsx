import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ACTIONS = [
  { icon: '✅', labelKey: 'nav.tasks', to: '/tasks', color: '#4CAF50' },
  { icon: '👶', labelKey: 'nav.kids', to: '/kids', color: '#2196F3' },
  { icon: '🛒', labelKey: 'nav.kitchen', to: '/kitchen', color: '#FF9800' },
  { icon: '💰', labelKey: 'nav.budget', to: '/budget', color: '#9C27B0' },
];

export function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="px-4 mt-3">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
        {t('dashboard.quickActions')}
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-white/5"
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
              {t(a.labelKey)}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
