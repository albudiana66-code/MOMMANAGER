import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', labelKey: 'nav.home' },
  { to: '/tasks', icon: '✅', labelKey: 'nav.tasks' },
  { to: '/kids', icon: '👶', labelKey: 'nav.kids' },
  { to: '/kitchen', icon: '🛒', labelKey: 'nav.kitchen' },
  { to: '/selfcare', icon: '💗', labelKey: 'nav.selfcare' },
  { to: '/budget', icon: '💰', labelKey: 'nav.budget' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-white/10"
      style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive ? 'text-[#E91E8C]' : 'text-[var(--text-secondary)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  className="text-xl"
                  animate={{ scale: isActive ? 1.2 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {item.icon}
                </motion.span>
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
