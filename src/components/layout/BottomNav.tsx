import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', emoji: '🏡', labelKey: 'nav.home' },
  { to: '/tasks', emoji: '📅', labelKey: 'nav.tasks' },
  { to: '/kids', emoji: '🧸', labelKey: 'nav.kids' },
  { to: '/kitchen', emoji: '🍳', labelKey: 'nav.kitchen' },
  { to: '/selfcare', emoji: '💆‍♀️', labelKey: 'nav.selfcare' },
  { to: '/budget', emoji: '💳', labelKey: 'nav.budget' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        maxWidth: 430,
        margin: '0 auto',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(196,120,138,0.10)',
        boxShadow: '0 -2px 20px rgba(196,120,138,0.06)',
      }}
    >
      <div className="flex items-center justify-around px-1 pb-safe" style={{ paddingTop: 5, paddingBottom: 'max(5px, env(safe-area-inset-bottom, 5px))' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0', gap: 2, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <>
                <motion.span
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ fontSize: 18, lineHeight: 1 }}
                >
                  {item.emoji}
                </motion.span>
                <span style={{
                  fontSize: 9,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.04em',
                  color: isActive ? '#C4788A' : '#9A8880',
                  lineHeight: 1,
                }}>
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
